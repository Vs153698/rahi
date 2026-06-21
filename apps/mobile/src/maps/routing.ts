import * as Speech from 'expo-speech';

import {
  ComputedRouteSchema,
  SYNC_TABLES,
  type ComputedRoute,
  type RouteInstruction,
} from '@rahi/shared';

import { env } from '../config/env';
import { db } from '../db/powersync';
import { supabase } from '../supabase';

/**
 * Routing on the device (Task 2.3, rahi-docs/07 §3). Route *computation* is an
 * online-only API call (GraphHopper is server-side); the result is persisted
 * server-side and arrives via sync, cached in the local `routes` table for
 * offline use. Turn prompts are spoken from the cached instruction list — no
 * connection needed mid-ride.
 */
export class OfflineRouteError extends Error {
  constructor() {
    super('Route will be computed when you are back online.');
    this.name = 'OfflineRouteError';
  }
}

/** Online-only: ask the API to compute + persist the route for a trip. */
export async function computeRoute(
  tripId: string,
  start: { lng: number; lat: number },
  end: { lng: number; lat: number },
): Promise<{ routeId: string; route: ComputedRoute }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/routing/compute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tripId, start, end }),
    });
  } catch {
    throw new OfflineRouteError();
  }
  if (!res.ok) throw new Error(`Route compute failed (${res.status})`);
  return (await res.json()) as { routeId: string; route: ComputedRoute };
}

interface RouteRow {
  geometry: string | null;
  instructions: string | null;
  distance_km: number | null;
}

/** Read the cached route for a trip from local SQLite (works fully offline). */
export async function getCachedRoute(tripId: string): Promise<ComputedRoute | null> {
  const rows = await db.getAll<RouteRow>(
    `SELECT geometry, instructions, distance_km FROM ${SYNC_TABLES.routes}
     WHERE trip_id = ? ORDER BY updated_at DESC LIMIT 1`,
    [tripId],
  );
  const row = rows[0];
  if (!row?.geometry) return null;

  const geometry = JSON.parse(row.geometry) as { coordinates: [number, number][] };
  const instructions = row.instructions
    ? (JSON.parse(row.instructions) as RouteInstruction[])
    : [];
  const candidate = {
    coordinates: geometry.coordinates,
    distanceKm: row.distance_km ?? 0,
    instructions,
  };
  const parsed = ComputedRouteSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

/** Speak a turn instruction offline (rahi-docs/07 §3). */
export function speakInstruction(instruction: RouteInstruction): void {
  Speech.speak(instruction.text, { language: 'en-IN', rate: 1.0 });
}
