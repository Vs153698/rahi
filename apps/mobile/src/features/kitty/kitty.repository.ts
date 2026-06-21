import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, deriveKittyBalance } from '@rahi/shared';

import { BaseRepository } from '../../db/repositories/base.repository';

/**
 * Kitty — the group's common pool (Task 4.3, rahi-docs/04 §4, /05 §3). Modelled
 * as APPEND-ONLY `kitty_contributions` with a DERIVED balance; the balance is
 * never edited directly, so it's conflict-free under offline merge (you can't
 * create a merge conflict on a number you only ever sum). Writes flow through the
 * durable PowerSync queue.
 */
type Method = 'cash' | 'upi' | 'razorpay';

interface ContributionRow {
  amount_paise: number;
}

class KittyRepository extends BaseRepository {
  /** Ensure a kitty row exists for the group; returns its id. */
  async ensureKitty(groupId: string): Promise<string> {
    const existing = await this.db.getAll<{ id: string }>(
      `SELECT id FROM ${SYNC_TABLES.kitty} WHERE group_id = ? LIMIT 1`,
      [groupId],
    );
    if (existing[0]) return existing[0].id;
    const id = randomUUID();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.kitty} (id, group_id, balance_paise, updated_at)
         VALUES (?, ?, 0, ?)`,
        [id, groupId, new Date().toISOString()],
      ),
    );
    return id;
  }

  /** Append a contribution (never edits a balance). */
  async contribute(params: {
    groupId: string;
    memberId: string;
    amountPaise: number;
    method: Method;
    razorpayPaymentId?: string | null;
  }): Promise<void> {
    const kittyId = await this.ensureKitty(params.groupId);
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.kitty_contributions}
           (id, kitty_id, member_id, amount_paise, method, razorpay_payment_id, occurred_at, group_id, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          kittyId,
          params.memberId,
          params.amountPaise,
          params.method,
          params.razorpayPaymentId ?? null,
          now,
          params.groupId,
          now,
        ],
      ),
    );
  }

  /** Derived balance = sum(contributions) − spent. Never read from a stored field. */
  async balance(groupId: string, spentPaise = 0): Promise<number> {
    const rows = await this.db.getAll<ContributionRow>(
      `SELECT amount_paise FROM ${SYNC_TABLES.kitty_contributions} WHERE group_id = ?`,
      [groupId],
    );
    return deriveKittyBalance(rows, spentPaise);
  }
}

export const kittyRepository = new KittyRepository();
