/**
 * Barometer-based altitude, AMS and storm math (Task 10.3). All pure + offline —
 * the device's barometer feeds these; no network. AMS guidance is conservative
 * and informational, not medical advice (// verify with a doctor).
 */

/** International barometric formula: pressure (hPa) → altitude (m). */
export function pressureToAltitudeM(pressureHpa: number, seaLevelHpa = 1013.25): number {
  return Math.round(44330 * (1 - Math.pow(pressureHpa / seaLevelHpa, 1 / 5.255)));
}

export interface AltSample {
  altitudeM: number;
  t: number; // epoch ms
}

/** Net ascent (m) over the trailing window (gains − losses, floored at 0). */
export function ascentOverWindow(samples: AltSample[], windowMs: number, now: number): number {
  const recent = samples.filter((s) => now - s.t <= windowMs).sort((a, b) => a.t - b.t);
  if (recent.length < 2) return 0;
  const net = recent[recent.length - 1]!.altitudeM - recent[0]!.altitudeM;
  return Math.max(0, Math.round(net));
}

export interface AmsWarning {
  warn: boolean;
  reason: string | null;
}

/**
 * AMS ascent-rate warning. Above ~3000 m, gaining more than ~600 m of sleeping
 * altitude in a day raises AMS risk (guidance is ~500 m/day). Informational.
 */
export function amsAscentWarning(currentAltitudeM: number, ascent24hM: number): AmsWarning {
  if (currentAltitudeM >= 3000 && ascent24hM > 600) {
    return {
      warn: true,
      reason: `Gained ${ascent24hM} m above 3,000 m in a day — ascend slower, hydrate, watch for AMS symptoms.`,
    };
  }
  return { warn: false, reason: null };
}

export interface PressureSample {
  hpa: number;
  t: number; // epoch ms
}

/** Pressure change (hPa) over the trailing window (negative = falling). */
export function pressureChange(samples: PressureSample[], windowMs: number, now: number): number {
  const recent = samples.filter((s) => now - s.t <= windowMs).sort((a, b) => a.t - b.t);
  if (recent.length < 2) return 0;
  return Math.round((recent[recent.length - 1]!.hpa - recent[0]!.hpa) * 10) / 10;
}

/**
 * Storm warning from a rapid pressure drop. A fall of ≥3 hPa over ~3 h indicates
 * a fast-approaching weather system. (Account for altitude gain separately — a
 * climb also drops pressure; callers pass barometric pressure de-trended for
 * altitude where possible.)
 */
export function stormWarning(dropOver3hHpa: number): boolean {
  return dropOver3hHpa <= -3;
}
