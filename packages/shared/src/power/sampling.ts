/**
 * Adaptive sampling for battery (Task 11.1, rahi-docs/06 §7). Background location
 * + sensors are the battery hot spot, so the sampling interval adapts to speed
 * and battery: sample often when moving fast with charge, back off when slow,
 * stopped, or low on battery. Pure + testable so the policy is tunable.
 */
export interface SamplingContext {
  speedKmh: number;
  /** 0..1 battery level. */
  batteryFraction: number;
  charging: boolean;
}

export const MIN_INTERVAL_S = 5;
export const MAX_INTERVAL_S = 120;

/** Seconds between location/beacon samples for the given context. */
export function adaptiveSamplingSeconds(ctx: SamplingContext): number {
  // Base on speed: faster → more frequent (cover more ground between fixes).
  let interval: number;
  if (ctx.speedKmh < 2) interval = 60; // stopped
  else if (ctx.speedKmh < 30) interval = 20;
  else if (ctx.speedKmh < 70) interval = 10;
  else interval = 6;

  // Low battery (and not charging) → back off to conserve.
  if (!ctx.charging) {
    if (ctx.batteryFraction < 0.15) interval *= 3;
    else if (ctx.batteryFraction < 0.3) interval *= 1.8;
  }

  return Math.round(Math.min(MAX_INTERVAL_S, Math.max(MIN_INTERVAL_S, interval)));
}

export type PowerMode = 'trip' | 'balanced' | 'saver';

/** A coarse mode label for the trip-mode power indicator UI. */
export function powerMode(ctx: SamplingContext): PowerMode {
  if (!ctx.charging && ctx.batteryFraction < 0.2) return 'saver';
  if (ctx.speedKmh >= 2) return 'trip';
  return 'balanced';
}
