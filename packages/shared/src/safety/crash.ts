/**
 * Crash-signature detection (Task 6.3). Pure decision over a window of total
 * acceleration magnitudes (in g; ~1g at rest). A crash looks like a hard spike
 * followed by stillness (bike down, not moving). Keeping this pure means we can
 * tune + test thresholds without a device — and avoid false positives, which is
 * the whole game for an auto-SOS.
 *
 * Returning a *candidate* only — the UI always shows a countdown the rider can
 * cancel before anything is sent (rahi-docs/10/11). We never auto-fire silently.
 */
export interface CrashOptions {
  /** Spike threshold in g for the impact. */
  spikeG?: number;
  /** How close to 1g (rest) the tail must be to count as "stopped". */
  stillnessToleranceG?: number;
  /** Number of trailing samples that must be still. */
  stillnessSamples?: number;
}

export function peakG(samples: number[]): number {
  return samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0);
}

/**
 * True if the window contains a hard impact spike AND ends in stillness.
 * Requires enough trailing samples to assess stillness, so a brief pothole jolt
 * (spike but rider keeps moving) does not trigger.
 */
export function isCrashSignature(samples: number[], opts: CrashOptions = {}): boolean {
  const spikeG = opts.spikeG ?? 6;
  const tol = opts.stillnessToleranceG ?? 0.35;
  const stillN = opts.stillnessSamples ?? 8;
  if (samples.length < stillN + 1) return false;

  const peak = peakG(samples);
  if (peak < spikeG) return false;

  const tail = samples.slice(-stillN);
  const stillTail = tail.every((g) => Math.abs(g - 1) <= tol);
  // The spike must have happened before the still tail (impact → down).
  const spikeBeforeTail = peakG(samples.slice(0, samples.length - stillN)) >= spikeG;
  return stillTail && spikeBeforeTail;
}
