/**
 * Shared merge primitives. These reducers run IDENTICALLY on the app and the
 * server (rahi-docs/05 §4) so a row converges to the same value regardless of
 * where the merge happens or whether a change arrived via cloud or mesh
 * (rahi-docs/05 §7). All reducers are pure and deterministic — no wall-clock
 * reads, no randomness — so two devices with the same inputs always agree.
 */

/** Minimal fields every synced, mergeable row carries. */
export interface SyncRow {
  id: string;
  updated_at: string; // ISO timestamptz
  client_updated_at?: string | null;
  deleted_at?: string | null;
}

/** Parse an ISO timestamp to epoch ms; missing/invalid sorts oldest. */
export function ts(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Date.parse(value);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Stable comparison for tie-breaking. Returns the "winner" of two rows using a
 * cascade of keys; the final key is the id so the result is total and identical
 * on every device (never relies on raw wall-clock alone — rahi-docs/05 §8).
 */
export function pickByCascade<T extends SyncRow>(
  a: T,
  b: T,
  keys: ((row: T) => number | string)[],
): T {
  for (const key of keys) {
    const ka = key(a);
    const kb = key(b);
    if (ka < kb) return b;
    if (ka > kb) return a;
  }
  // Total order fallback: lexicographic id (stable across devices).
  return a.id <= b.id ? a : b;
}
