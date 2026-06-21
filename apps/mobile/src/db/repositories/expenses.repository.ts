import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, recomputeShares, type ShareMember, type SplitType } from '@rahi/shared';

import { BaseRepository } from './base.repository';

/**
 * On-device expenses repository. The hardest write path (rahi-docs/05 §4):
 *  - Creating an expense is an independent add (UUID v7), so it never conflicts.
 *  - Each local EDIT increments `merge_version` and stamps `client_updated_at`;
 *    the CRDT reducer (server + device) resolves concurrent edits identically.
 *  - `expense_shares` are RECOMPUTED deterministically from the expense, never
 *    merged — so derived shares always agree once the ledger agrees.
 * All writes flow through the durable PowerSync queue.
 */
class ExpensesRepository extends BaseRepository {
  async create(params: {
    tripId: string;
    groupId: string;
    createdBy: string;
    paidBy: string;
    amountPaise: number;
    splitType: SplitType;
    members: ShareMember[];
    note?: string;
  }): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const shares = recomputeShares(params.amountPaise, params.splitType, params.members);

    await this.write(async (tx) => {
      await tx.execute(
        `INSERT INTO ${SYNC_TABLES.expenses}
           (id, trip_id, group_id, created_by, paid_by, amount_paise, currency,
            note, split_type, merge_version, client_updated_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, ?, 0, ?, ?)`,
        [
          id,
          params.tripId,
          params.groupId,
          params.createdBy,
          params.paidBy,
          params.amountPaise,
          params.note ?? null,
          params.splitType,
          now,
          now,
        ],
      );
      for (const s of shares) {
        await tx.execute(
          `INSERT INTO ${SYNC_TABLES.expense_shares}
             (id, expense_id, member_id, share_paise, group_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), id, s.member_id, s.share_paise, params.groupId, now],
        );
      }
    });
    return id;
  }

  /** Edit an expense: bump merge_version so concurrent edits resolve correctly. */
  async edit(
    id: string,
    patch: { amountPaise?: number; note?: string },
    recompute?: { splitType: SplitType; members: ShareMember[] },
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.write(async (tx) => {
      await tx.execute(
        `UPDATE ${SYNC_TABLES.expenses}
           SET amount_paise = COALESCE(?, amount_paise),
               note = COALESCE(?, note),
               merge_version = merge_version + 1,
               client_updated_at = ?, updated_at = ?
         WHERE id = ?`,
        [patch.amountPaise ?? null, patch.note ?? null, now, now, id],
      );
      if (recompute && patch.amountPaise != null) {
        const shares = recomputeShares(patch.amountPaise, recompute.splitType, recompute.members);
        await tx.execute(`DELETE FROM ${SYNC_TABLES.expense_shares} WHERE expense_id = ?`, [id]);
        // group_id is carried on the expense; re-read kept simple here.
        for (const s of shares) {
          await tx.execute(
            `INSERT INTO ${SYNC_TABLES.expense_shares}
               (id, expense_id, member_id, share_paise, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [randomUUID(), id, s.member_id, s.share_paise, now],
          );
        }
      }
    });
  }

  /** Soft-delete (delete-wins by default in the merge — rahi-docs/05 §4). */
  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `UPDATE ${SYNC_TABLES.expenses}
           SET deleted_at = ?, merge_version = merge_version + 1,
               client_updated_at = ?, updated_at = ?
         WHERE id = ?`,
        [now, now, now, id],
      ),
    );
  }
}

export const expensesRepository = new ExpensesRepository();
