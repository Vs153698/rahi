import type { ModerationStatus } from '../merge/counter';

/**
 * Hazard-report moderation decision (Task 9.4, rahi-docs/10). Pure rule that
 * derives the moderation status from crowd signals: enough flags relative to
 * confirmations auto-hides a report for admin review; a manual admin action
 * overrides. The additive counters themselves merge via `mergeHazard`
 * (counter-merge) — this just decides visibility from the merged totals.
 */
export interface ModerationInput {
  confirmations: number;
  flagCount: number;
  /** Set by an admin action; wins over the automatic rule. */
  adminOverride?: ModerationStatus;
}

export const FLAG_HIDE_THRESHOLD = 3;

export function moderationFromFlags(input: ModerationInput): ModerationStatus {
  if (input.adminOverride) return input.adminOverride;
  // Auto-hide for review once flags reach the threshold AND outweigh confirmations.
  if (input.flagCount >= FLAG_HIDE_THRESHOLD && input.flagCount > input.confirmations) {
    return 'under_review';
  }
  return 'visible';
}

export type HazardKind = 'landslide' | 'washout' | 'bad_road' | 'diversion' | 'other';
export const HAZARD_KINDS: HazardKind[] = ['landslide', 'washout', 'bad_road', 'diversion', 'other'];
