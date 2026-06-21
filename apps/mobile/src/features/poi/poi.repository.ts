import { SYNC_TABLES, nearestByCategory, type GeoPoint, type PoiCategory } from '@rahi/shared';

import { db } from '../../db/powersync';

export interface CorridorPoi extends GeoPoint {
  id: string;
  poi_id: string;
  category: PoiCategory;
  name: string | null;
  distance_from_route_m: number | null;
  tags: Record<string, string>;
}

interface CorridorRow {
  id: string;
  poi_id: string;
  category: PoiCategory;
  name: string | null;
  geom: string | null;
  distance_from_route_m: number | null;
  tags: string | null;
}

function parseRow(r: CorridorRow): CorridorPoi | null {
  if (!r.geom) return null;
  const g = JSON.parse(r.geom) as { coordinates: [number, number] } | { type: string; coordinates: [number, number] };
  const [lng, lat] = (g as { coordinates: [number, number] }).coordinates;
  return {
    id: r.id,
    poi_id: r.poi_id,
    category: r.category,
    name: r.name,
    lng,
    lat,
    distance_from_route_m: r.distance_from_route_m,
    tags: r.tags ? (JSON.parse(r.tags) as Record<string, string>) : {},
  };
}

/**
 * Offline POI access (Task 3.3, rahi-docs/07 §2). Reads the trip-scoped corridor
 * subset from local SQLite — browse, filter by category, and "nearest X" all work
 * with no signal. The offline corridor subset is a Pro feature; callers pass the
 * resolved entitlement and the repository enforces it.
 */
export class PoiOfflineUnavailableError extends Error {
  constructor() {
    super('Offline POIs along your route are a Rahi Pro feature.');
    this.name = 'PoiOfflineUnavailableError';
  }
}

export const poiRepository = {
  /** All corridor POIs for a trip, optionally filtered by category. */
  async listForTrip(
    tripId: string,
    opts: { isPro: boolean; category?: PoiCategory },
  ): Promise<CorridorPoi[]> {
    if (!opts.isPro) throw new PoiOfflineUnavailableError();
    const params: unknown[] = [tripId];
    let sql = `SELECT id, poi_id, category, name, geom, distance_from_route_m, tags
               FROM ${SYNC_TABLES.poi_corridor_sync} WHERE trip_id = ?`;
    if (opts.category) {
      sql += ' AND category = ?';
      params.push(opts.category);
    }
    sql += ' ORDER BY distance_from_route_m ASC';
    const rows = await db.getAll<CorridorRow>(sql, params);
    return rows.map(parseRow).filter((p): p is CorridorPoi => p !== null);
  },

  /** Nearest POIs of a category to a point (e.g. "nearest fuel"), offline. */
  async nearest(
    tripId: string,
    from: GeoPoint,
    category: PoiCategory,
    opts: { isPro: boolean; limit?: number },
  ): Promise<(CorridorPoi & { distanceM: number })[]> {
    const all = await this.listForTrip(tripId, { isPro: opts.isPro });
    return nearestByCategory(from, all, category, opts.limit ?? 5);
  },
};
