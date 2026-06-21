import { ts, type SyncRow } from './types';

/**
 * Counter merge for crowd-aggregated hazard reports (rahi-docs/05 §3). The
 * `confirmations` and `flag_count` counters are additive across riders.
 *
 * Naive `max(a, b)` would lose concurrent increments; naive `a + b` would
 * double-count the shared history. We merge additively against the last common
 * value (`base`): merged = base + (a - base) + (b - base) = a + b - base. When
 * no common base is known we fall back to `max` (safe, may under-count).
 *
 * `moderation_status` takes the most-restrictive of the two (removed >
 * under_review > visible) so a moderation action never gets undone by a stale
 * replica. Scalar fields (note) use updated_at LWW.
 */
export type ModerationStatus = 'visible' | 'under_review' | 'removed';

const MOD_RANK: Record<ModerationStatus, number> = {
  visible: 0,
  under_review: 1,
  removed: 2,
};

export interface MergeableHazard extends SyncRow {
  confirmations: number;
  flag_count: number;
  moderation_status: ModerationStatus;
  note?: string | null;
}

export function mergeCounter(a: number, b: number, base = 0): number {
  if (base > 0) return Math.max(0, a + b - base);
  return Math.max(a, b);
}

export function mergeMostRestrictive(a: ModerationStatus, b: ModerationStatus): ModerationStatus {
  return MOD_RANK[a] >= MOD_RANK[b] ? a : b;
}

export function mergeHazard<T extends MergeableHazard>(
  a: T,
  b: T,
  base?: { confirmations: number; flag_count: number },
): T {
  const newer = ts(a.updated_at) >= ts(b.updated_at) ? a : b;
  return {
    ...newer,
    confirmations: mergeCounter(a.confirmations, b.confirmations, base?.confirmations ?? 0),
    flag_count: mergeCounter(a.flag_count, b.flag_count, base?.flag_count ?? 0),
    moderation_status: mergeMostRestrictive(a.moderation_status, b.moderation_status),
  };
}
