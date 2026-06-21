import {
  computeBalances,
  suggestSettlements,
  SYNC_TABLES,
  type MemberBalances,
  type SettleSuggestion,
} from '@rahi/shared';

import { db } from '../../db/powersync';

/**
 * Read side of the expense ledger (Task 4.1). All reads are reactive local SQLite
 * queries over the CRDT-merged tables; balances are recomputed with the shared
 * pure calculator so every device shows identical numbers once the ledger
 * converges (rahi-docs/05 §4). Writes go through db/repositories/expenses.repository.
 */
export interface ExpenseListItem {
  id: string;
  paid_by: string | null;
  amount_paise: number;
  category: string | null;
  note: string | null;
  occurred_at: string | null;
  deleted_at: string | null;
}

interface ExpenseRow extends ExpenseListItem {
  trip_id: string;
}
interface ShareRow {
  expense_id: string;
  member_id: string;
  share_paise: number;
}
interface SettlementRow {
  from_member: string;
  to_member: string;
  amount_paise: number;
  status: 'pending' | 'marked_paid' | 'confirmed';
}

export async function listExpenses(tripId: string): Promise<ExpenseListItem[]> {
  return db.getAll<ExpenseRow>(
    `SELECT id, paid_by, amount_paise, category, note, occurred_at, deleted_at
     FROM ${SYNC_TABLES.expenses} WHERE trip_id = ? AND deleted_at IS NULL
     ORDER BY occurred_at DESC, id DESC`,
    [tripId],
  );
}

/** Per-member net balances for a trip, from the merged ledger + confirmed settlements. */
export async function tripBalances(
  tripId: string,
  groupId: string,
): Promise<{ balances: MemberBalances; suggestions: SettleSuggestion[] }> {
  const expenses = await db.getAll<ExpenseRow>(
    `SELECT id, paid_by, amount_paise, deleted_at FROM ${SYNC_TABLES.expenses} WHERE trip_id = ?`,
    [tripId],
  );
  const shares = await db.getAll<ShareRow>(
    `SELECT expense_id, member_id, share_paise FROM ${SYNC_TABLES.expense_shares} WHERE group_id = ?`,
    [groupId],
  );
  const settlements = await db.getAll<SettlementRow>(
    `SELECT from_member, to_member, amount_paise, status FROM ${SYNC_TABLES.settlements} WHERE group_id = ?`,
    [groupId],
  );

  const balances = computeBalances({ expenses, shares, settlements });
  return { balances, suggestions: suggestSettlements(balances) };
}
