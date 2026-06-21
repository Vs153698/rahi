import type { RideStats } from './stats';

/**
 * Milestone badges (Task 10.2). Pure derivation from ride stats so awards are
 * deterministic and recomputable. Returned as stable badge kinds the recap and
 * profile render.
 */
export interface BadgeDef {
  kind: string;
  label: string;
  earned: (s: RideStats) => boolean;
}

export const BADGE_DEFS: BadgeDef[] = [
  { kind: 'altitude_3000', label: 'Above 3,000 m', earned: (s) => (s.maxAltitudeM ?? 0) >= 3000 },
  { kind: 'altitude_4000', label: 'Above 4,000 m', earned: (s) => (s.maxAltitudeM ?? 0) >= 4000 },
  { kind: 'altitude_5000', label: 'Above 5,000 m', earned: (s) => (s.maxAltitudeM ?? 0) >= 5000 },
  { kind: 'long_day_300', label: '300 km in a day', earned: (s) => s.longestDayKm >= 300 },
  { kind: 'long_day_500', label: '500 km in a day', earned: (s) => s.longestDayKm >= 500 },
  { kind: 'distance_1000', label: '1,000 km trip', earned: (s) => s.distanceKm >= 1000 },
  { kind: 'multi_state_3', label: '3 states crossed', earned: (s) => s.statesCrossed >= 3 },
];

/** Badge kinds earned for a set of ride stats. */
export function awardBadges(stats: RideStats): string[] {
  return BADGE_DEFS.filter((b) => b.earned(stats)).map((b) => b.kind);
}

export function badgeLabel(kind: string): string {
  return BADGE_DEFS.find((b) => b.kind === kind)?.label ?? kind;
}
