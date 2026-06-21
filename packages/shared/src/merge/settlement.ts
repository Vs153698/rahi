import { ts, type SyncRow } from './types';

/**
 * Settlement state-machine merge (rahi-docs/05 §3). Status only moves forward:
 * pending → marked_paid → confirmed. Concurrent transitions take the furthest
 * state; a tie on rank breaks on updated_at then a stable id. Monotonic, so it
 * converges regardless of order or transport.
 */
export type SettlementStatus = 'pending' | 'marked_paid' | 'confirmed';

const RANK: Record<SettlementStatus, number> = {
  pending: 0,
  marked_paid: 1,
  confirmed: 2,
};

export interface MergeableSettlement extends SyncRow {
  status: SettlementStatus;
  upi_ref?: string | null;
}

export function mergeSettlement<T extends MergeableSettlement>(a: T, b: T): T {
  const ra = RANK[a.status];
  const rb = RANK[b.status];
  if (ra !== rb) return ra > rb ? a : b;

  // Same rank: prefer the most recent, then stable id. Carry a upi_ref if only
  // one side has it (a forward transition often adds the reference).
  const winner = ts(a.updated_at) > ts(b.updated_at) || (ts(a.updated_at) === ts(b.updated_at) && a.id <= b.id) ? a : b;
  const other = winner === a ? b : a;
  return { ...winner, upi_ref: winner.upi_ref ?? other.upi_ref ?? null };
}
