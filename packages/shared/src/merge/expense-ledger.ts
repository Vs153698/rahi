import { pickByCascade, ts, type SyncRow } from './types';

/**
 * Expense-ledger CRDT merge — the one place Rahi genuinely needs merge logic
 * (rahi-docs/05 §4). Two riders in a dead zone both add expenses and edit a
 * shared one; on reconnect they must converge with no lost or double-counted
 * entries.
 *
 * Rules:
 *  - ADDs are independent rows (UUID v7 generated offline) — they union, never
 *    conflict.
 *  - EDITs to the same expense resolve by highest `merge_version`; ties break on
 *    `client_updated_at`, then `created_by` (stable). `merge_version` increments
 *    on each local edit.
 *  - DELETEs are soft (`deleted_at`). Default: a delete wins over a concurrent
 *    edit UNLESS the edit's `merge_version` strictly exceeds the delete's
 *    (configurable via `editBeatsDelete`) — avoids zombie expenses.
 *
 * Pure + deterministic: same inputs → same output on every device (and over
 * mesh — rahi-docs/05 §7).
 */
export interface MergeableExpense extends SyncRow {
  merge_version: number;
  created_by: string;
  deleted_at?: string | null;
}

export interface ExpenseMergeOptions {
  /** If true, a higher-version edit beats a delete. Default false (delete wins). */
  editBeatsDelete?: boolean;
}

const isDeleted = (e: MergeableExpense): boolean => Boolean(e.deleted_at);

/** Resolve two versions of the SAME expense (same id) deterministically. */
export function mergeExpensePair<T extends MergeableExpense>(
  a: T,
  b: T,
  opts: ExpenseMergeOptions = {},
): T {
  const aDel = isDeleted(a);
  const bDel = isDeleted(b);

  // Exactly one is a delete: a delete loses to a strictly-later edit; on an
  // equal merge_version the `editBeatsDelete` option decides (default: delete
  // wins, to avoid zombie expenses).
  if (aDel !== bDel) {
    const del = aDel ? a : b;
    const edit = aDel ? b : a;
    if (edit.merge_version > del.merge_version) return edit;
    if (edit.merge_version < del.merge_version) return del;
    return opts.editBeatsDelete ? edit : del;
  }

  // Both deleted or both live: highest merge_version, then client_updated_at,
  // then created_by, then stable id.
  return pickByCascade(a, b, [
    (r) => r.merge_version,
    (r) => ts(r.client_updated_at),
    (r) => r.created_by,
  ]);
}

/**
 * Merge two ledgers (local + remote snapshots). Adds union; edits to shared ids
 * resolve via mergeExpensePair. Output is sorted by id for a canonical,
 * device-independent ordering.
 */
export function mergeExpenseLedger<T extends MergeableExpense>(
  local: T[],
  remote: T[],
  opts: ExpenseMergeOptions = {},
): T[] {
  const byId = new Map<string, T>();
  for (const e of local) byId.set(e.id, e);
  for (const e of remote) {
    const existing = byId.get(e.id);
    byId.set(e.id, existing ? mergeExpensePair(existing, e, opts) : e);
  }
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}
