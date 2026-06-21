import { pickByCascade, ts, type SyncRow } from './types';

/**
 * Last-write-wins merge for single-owner, low-contention tables
 * (profiles, bikes, emergency_contacts, group_members — rahi-docs/05 §3).
 *
 * Winner is chosen by updated_at, then client_updated_at, then a stable id
 * tiebreak. Whole-row (not per-field): these tables are edited by one owner, so
 * row-level LWW is sufficient and conflict-free in practice. The id tiebreak
 * guarantees convergence even under clock skew (rahi-docs/05 §8).
 */
export function mergeLww<T extends SyncRow>(a: T, b: T): T {
  return pickByCascade(a, b, [(r) => ts(r.updated_at), (r) => ts(r.client_updated_at)]);
}

/** Merge two snapshots of a table (arrays) keyed by id using LWW per row. */
export function mergeLwwCollection<T extends SyncRow>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const existing = byId.get(row.id);
    byId.set(row.id, existing ? mergeLww(existing, row) : row);
  }
  return [...byId.values()].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
}
