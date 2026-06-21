/**
 * Deterministic expense-share recomputation (rahi-docs/05 §4). `expense_shares`
 * are RECOMPUTED from the merged `expenses` on every device rather than merged
 * themselves — so derived shares never need their own conflict resolution and
 * always agree once the ledger agrees.
 *
 * All math is in paise (integers) to avoid float drift. Remainder paise from a
 * non-even division are distributed deterministically to the lowest member ids
 * first, so every device produces byte-identical shares.
 */
export type SplitType = 'equal' | 'custom' | 'by_distance' | 'per_bike';

export interface ShareMember {
  member_id: string;
  /** Distance ridden (for by_distance) — meters or km, any consistent unit. */
  distance?: number;
  /** Bike count weight (for per_bike); defaults to 1. */
  bikes?: number;
  /** Explicit share for custom splits, in paise. */
  custom_paise?: number;
}

export interface ComputedShare {
  member_id: string;
  share_paise: number;
}

/** Split an integer total across positive weights, remainder to lowest ids. */
function splitByWeights(
  totalPaise: number,
  members: { member_id: string; weight: number }[],
): ComputedShare[] {
  const totalWeight = members.reduce((s, m) => s + m.weight, 0);
  if (totalWeight <= 0) {
    // Degenerate: fall back to equal split.
    return splitEqual(
      totalPaise,
      members.map((m) => m.member_id),
    );
  }
  const base = members.map((m) => ({
    member_id: m.member_id,
    share_paise: Math.floor((totalPaise * m.weight) / totalWeight),
  }));
  let remainder = totalPaise - base.reduce((s, m) => s + m.share_paise, 0);
  // Distribute the leftover paise to lowest member ids for determinism.
  const order = [...base].sort((a, b) => (a.member_id < b.member_id ? -1 : 1));
  for (let i = 0; remainder > 0 && i < order.length; i++, remainder--) {
    order[i]!.share_paise += 1;
  }
  return base;
}

function splitEqual(totalPaise: number, memberIds: string[]): ComputedShare[] {
  return splitByWeights(
    totalPaise,
    memberIds.map((member_id) => ({ member_id, weight: 1 })),
  );
}

export function recomputeShares(
  amountPaise: number,
  splitType: SplitType,
  members: ShareMember[],
): ComputedShare[] {
  switch (splitType) {
    case 'equal':
      return splitEqual(
        amountPaise,
        members.map((m) => m.member_id),
      );
    case 'custom': {
      // Custom amounts are authoritative; if they don't sum to the total, the
      // shortfall/overage is spread equally (keeps the ledger balanced).
      const explicit = members.map((m) => ({
        member_id: m.member_id,
        share_paise: m.custom_paise ?? 0,
      }));
      const assigned = explicit.reduce((s, m) => s + m.share_paise, 0);
      const drift = amountPaise - assigned;
      if (drift === 0) return explicit;
      const spread = splitEqual(
        drift > 0 ? drift : 0,
        members.map((m) => m.member_id),
      );
      return explicit.map((e, i) => ({
        member_id: e.member_id,
        share_paise: e.share_paise + (spread[i]?.share_paise ?? 0),
      }));
    }
    case 'by_distance':
      return splitByWeights(
        amountPaise,
        members.map((m) => ({ member_id: m.member_id, weight: Math.max(0, m.distance ?? 0) })),
      );
    case 'per_bike':
      return splitByWeights(
        amountPaise,
        members.map((m) => ({ member_id: m.member_id, weight: Math.max(0, m.bikes ?? 1) })),
      );
    default: {
      // Exhaustiveness guard.
      const _never: never = splitType;
      return _never;
    }
  }
}
