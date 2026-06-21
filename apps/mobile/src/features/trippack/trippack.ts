import {
  buildOpenMeteoUrl,
  parseOpenMeteoDaily,
  type DailyForecast,
  type OpenMeteoDaily,
} from '@rahi/shared';

import { db } from '../../db/powersync';
import { downloadPack, listAvailablePacks } from '../../maps/offlinePacks';

/**
 * One-tap trip pack (Task 9.1, rahi-docs/07 §5). Bundles everything the rider
 * needs offline for a corridor into a single pre-download: the map tile pack,
 * the corridor POIs (already synced via sync rules once ingested), and a cached
 * weather forecast. Reports progress per step. Pro-gated by the caller (tile
 * download requires Pro).
 */
const WEATHER_BASE = 'https://api.open-meteo.com';

export type TripPackStep = 'tiles' | 'weather' | 'done';

export interface TripPackProgress {
  step: TripPackStep;
  fraction: number;
}

async function cacheWeather(tripId: string, lat: number, lng: number): Promise<DailyForecast[]> {
  const res = await fetch(buildOpenMeteoUrl(WEATHER_BASE, lat, lng)).catch(() => null);
  if (!res?.ok) return [];
  const body = (await res.json()) as OpenMeteoDaily;
  const forecast = parseOpenMeteoDaily(body);
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM weather_cache WHERE trip_id = ?`, [tripId]);
    await tx.execute(
      `INSERT INTO weather_cache (id, trip_id, forecast_json, fetched_at) VALUES (uuid(), ?, ?, ?)`,
      [tripId, JSON.stringify(forecast), new Date().toISOString()],
    );
  });
  return forecast;
}

export async function getCachedWeather(tripId: string): Promise<DailyForecast[]> {
  const rows = await db.getAll<{ forecast_json: string }>(
    `SELECT forecast_json FROM weather_cache WHERE trip_id = ? LIMIT 1`,
    [tripId],
  );
  return rows[0] ? (JSON.parse(rows[0].forecast_json) as DailyForecast[]) : [];
}

/**
 * Pre-download the whole corridor. `start` is a point near the route (used for
 * the weather fetch). Tile packs for the trip download on wifi; POIs are already
 * synced. Emits progress.
 */
export async function oneTapTripPack(params: {
  tripId: string;
  isPro: boolean;
  start: { lng: number; lat: number };
  onWifi: boolean;
  onProgress?: (p: TripPackProgress) => void;
}): Promise<{ tilePacks: number; forecastDays: number }> {
  const report = (step: TripPackStep, fraction: number) =>
    params.onProgress?.({ step, fraction });

  // 1) Tile packs for this trip.
  report('tiles', 0.1);
  const packs = (await listAvailablePacks()).filter((p) => p.trip_id === params.tripId);
  let downloaded = 0;
  for (const pack of packs) {
    await downloadPack(pack, {
      isPro: params.isPro,
      onWifi: params.onWifi,
      confirmedLarge: true,
      onProgress: (f) => report('tiles', 0.1 + 0.7 * ((downloaded + f) / Math.max(1, packs.length))),
    });
    downloaded++;
  }

  // 2) Weather for the corridor window.
  report('weather', 0.85);
  const forecast = await cacheWeather(params.tripId, params.start.lat, params.start.lng);

  report('done', 1);
  return { tilePacks: downloaded, forecastDays: forecast.length };
}
