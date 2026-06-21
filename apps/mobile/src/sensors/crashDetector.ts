import { Accelerometer } from 'expo-sensors';

import { isCrashSignature, type CrashOptions } from '@rahi/shared';

/**
 * Accelerometer crash detector (Task 6.3). Streams total-acceleration magnitude
 * (in g) into a rolling window and flags a crash *signature* (hard impact then
 * stillness) using the shared pure detector. On a candidate it calls `onCandidate`
 * — the UI then shows a cancellable countdown before any SOS is sent. Pro-gated
 * by the caller; never fires silently.
 */
const WINDOW = 24; // ~1.2s at 50ms
const INTERVAL_MS = 50;

export interface CrashDetectorHandle {
  stop: () => void;
}

export function startCrashDetection(
  onCandidate: () => void,
  opts?: CrashOptions,
): CrashDetectorHandle {
  const window: number[] = [];
  let cooldownUntil = 0;

  Accelerometer.setUpdateInterval(INTERVAL_MS);
  const sub = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z); // ~1g at rest
    window.push(magnitude);
    if (window.length > WINDOW) window.shift();

    const now = Date.now();
    if (now < cooldownUntil) return;
    if (window.length === WINDOW && isCrashSignature(window, opts)) {
      cooldownUntil = now + 30_000; // avoid repeat triggers
      onCandidate();
    }
  });

  return { stop: () => sub.remove() };
}
