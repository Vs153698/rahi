import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, type SettleSuggestion } from '@rahi/shared';

import { BaseRepository } from '../db/repositories/base.repository';

/**
 * Settlements (Task 5.6, rahi-docs/09 B2). Rahi records who-owes-whom and tracks
 * the settle-up state machine (pending → marked_paid → confirmed, monotonic — the
 * shared `mergeSettlement` resolves concurrent transitions). The actual money
 * moves over UPI in the payer's own bank app; Rahi never custodies funds. Writes
 * go through the durable queue and work offline (the record syncs later).
 */
class SettlementsRepository extends BaseRepository {
  /** Create pending settlement rows from debt-simplified suggestions. */
  async createFromSuggestions(groupId: string, suggestions: SettleSuggestion[]): Promise<void> {
    if (suggestions.length === 0) return;
    const now = new Date().toISOString();
    await this.write(async (tx) => {
      for (const s of suggestions) {
        await tx.execute(
          `INSERT INTO ${SYNC_TABLES.settlements}
             (id, group_id, from_member, to_member, amount_paise, status, client_updated_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
          [randomUUID(), groupId, s.from, s.to, s.amount_paise, now, now],
        );
      }
    });
  }

  /** Payer marks a settlement paid (records an optional UPI ref). Forward-only. */
  async markPaid(id: string, upiRef?: string | null): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `UPDATE ${SYNC_TABLES.settlements}
           SET status = 'marked_paid', upi_ref = ?, client_updated_at = ?, updated_at = ?
         WHERE id = ? AND status = 'pending'`,
        [upiRef ?? null, now, now, id],
      ),
    );
  }

  /** Payee confirms receipt. Forward-only. */
  async confirm(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `UPDATE ${SYNC_TABLES.settlements}
           SET status = 'confirmed', client_updated_at = ?, updated_at = ?
         WHERE id = ? AND status = 'marked_paid'`,
        [now, now, id],
      ),
    );
  }
}

export const settlementsRepository = new SettlementsRepository();
