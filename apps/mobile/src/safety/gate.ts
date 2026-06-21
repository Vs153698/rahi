/**
 * Free/Pro safety split (Task 6.5, rahi-docs/14). The FREE floor is always
 * available: **manual SOS** (a rider in trouble must never hit a paywall). The
 * advanced, proactive safety — crash auto-detect, fuel-range, daylight, beacon,
 * dead-man's-switch — is Pro.
 */
export type AdvancedSafetyFeature =
  | 'crash_detect'
  | 'fuel_range'
  | 'daylight'
  | 'beacon'
  | 'deadman';

/** Manual SOS is ALWAYS allowed, subscription or not. */
export const MANUAL_SOS_IS_FREE = true;

export function canUseAdvancedSafety(isPro: boolean): boolean {
  return isPro;
}
