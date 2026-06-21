import { haversineMeters, type GeoPoint } from '../geo/track';

/**
 * Post-ride statistics (Task 10.2). Pure, computed from the recorded track so the
 * recap + badges are deterministic and recomputable. Feeds both the poster
 * (Task 10.1) and badge awarding.
 */
export interface TrackSample extends GeoPoint {
  altitudeM?: number | null;
  recordedAt: string; // ISO
  /** Optional state/region tag if a boundary lookup was available. */
  stateTag?: string | null;
}

export interface RideStats {
  distanceKm: number;
  maxAltitudeM: number | null;
  elevationGainM: number;
  durationMinutes: number;
  longestDayKm: number;
  statesCrossed: number;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function computeRideStats(samples: TrackSample[]): RideStats {
  if (samples.length === 0) {
    return {
      distanceKm: 0,
      maxAltitudeM: null,
      elevationGainM: 0,
      durationMinutes: 0,
      longestDayKm: 0,
      statesCrossed: 0,
    };
  }

  let distanceM = 0;
  let elevationGainM = 0;
  let maxAltitudeM: number | null = null;
  const perDayM: Record<string, number> = {};
  const states = new Set<string>();

  for (let i = 0; i < samples.length; i++) {
    const s = samples[i]!;
    if (s.altitudeM != null) maxAltitudeM = Math.max(maxAltitudeM ?? -Infinity, s.altitudeM);
    if (s.stateTag) states.add(s.stateTag);
    if (i > 0) {
      const prev = samples[i - 1]!;
      const seg = haversineMeters(prev, s);
      distanceM += seg;
      perDayM[dayKey(s.recordedAt)] = (perDayM[dayKey(s.recordedAt)] ?? 0) + seg;
      if (prev.altitudeM != null && s.altitudeM != null) {
        const gain = s.altitudeM - prev.altitudeM;
        if (gain > 0) elevationGainM += gain;
      }
    }
  }

  const start = Date.parse(samples[0]!.recordedAt);
  const end = Date.parse(samples[samples.length - 1]!.recordedAt);
  const longestDayM = Object.values(perDayM).reduce((m, v) => Math.max(m, v), 0);

  return {
    distanceKm: Math.round((distanceM / 1000) * 10) / 10,
    maxAltitudeM: maxAltitudeM === -Infinity ? null : maxAltitudeM,
    elevationGainM: Math.round(elevationGainM),
    durationMinutes: Math.max(0, Math.round((end - start) / 60000)),
    longestDayKm: Math.round((longestDayM / 1000) * 10) / 10,
    statesCrossed: states.size,
  };
}
