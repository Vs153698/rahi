import {
  SYNC_TABLES,
  awardBadges,
  computeRideStats,
  type RideStats,
  type TrackSample,
} from '@rahi/shared';

import { db } from '../../db/powersync';
import { env } from '../../config/env';
import { supabase } from '../../supabase';

/**
 * Post-ride recap (Task 10.1/10.2). Computes ride stats + badges from the local
 * track (offline, deterministic via shared math), then asks the API to persist
 * them and render the poster (server-authoritative; the result syncs back via
 * `recaps`/`badges`).
 */
interface TrackRow {
  geom: string;
  altitude_m: number | null;
  recorded_at: string;
}

export async function readTrackSamples(tripId: string): Promise<TrackSample[]> {
  const rows = await db.getAll<TrackRow>(
    `SELECT geom, altitude_m, recorded_at FROM ${SYNC_TABLES.track_points}
     WHERE trip_id = ? ORDER BY recorded_at ASC`,
    [tripId],
  );
  return rows.map((r) => {
    const g = JSON.parse(r.geom) as { coordinates: [number, number] };
    return {
      lng: g.coordinates[0],
      lat: g.coordinates[1],
      altitudeM: r.altitude_m,
      recordedAt: r.recorded_at,
    };
  });
}

export async function computeLocalRecap(tripId: string): Promise<{ stats: RideStats; badges: string[] }> {
  const samples = await readTrackSamples(tripId);
  const stats = computeRideStats(samples);
  return { stats, badges: awardBadges(stats) };
}

/** Persist + render the recap server-side (online). Result syncs back read-only. */
export async function generateRecap(tripId: string): Promise<{ recapId: string } | null> {
  const { stats, badges } = await computeLocalRecap(tripId);
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const res = await fetch(`${env.apiBaseUrl}/recap`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tripId, stats, badgeKinds: badges }),
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json()) as { recapId: string };
}
