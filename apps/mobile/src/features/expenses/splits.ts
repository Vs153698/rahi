import {
  pathLengthMeters,
  recomputeShares,
  type ComputedShare,
  type GeoPoint,
  type ShareMember,
  type SplitType,
} from '@rahi/shared';

/**
 * Split computation for the bill-splitter (Task 4.2). Delegates the actual math
 * to the shared `recomputeShares` (paise-exact, deterministic) so app and server
 * agree. This module adds the rider-specific bits: building by-distance weights
 * from each member's recorded track, and per-bike weights.
 *
 * by-distance is the "fair fuel split": a rider who rode 400 km pays more of the
 * fuel than one who rode 100 km (rahi-docs/00 §3, Phase 4 exit).
 */

export interface MemberTrack {
  memberId: string;
  /** That member's recorded breadcrumb coordinates for the trip. */
  coords: GeoPoint[];
}

/** Distance (meters) a member rode, from their track log. */
export function memberTrackDistance(coords: GeoPoint[]): number {
  return pathLengthMeters(coords);
}

/** Build by-distance ShareMembers from each member's track. */
export function byDistanceMembers(tracks: MemberTrack[]): ShareMember[] {
  return tracks.map((t) => ({ member_id: t.memberId, distance: memberTrackDistance(t.coords) }));
}

/** Build per-bike ShareMembers (default weight 1 each). */
export function perBikeMembers(memberIds: string[], bikesByMember?: Record<string, number>): ShareMember[] {
  return memberIds.map((member_id) => ({ member_id, bikes: bikesByMember?.[member_id] ?? 1 }));
}

/** Compute each member's share in paise for a given split type. */
export function computeSplit(
  amountPaise: number,
  splitType: SplitType,
  members: ShareMember[],
): ComputedShare[] {
  return recomputeShares(amountPaise, splitType, members);
}
