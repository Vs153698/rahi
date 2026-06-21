import { Injectable, Logger } from '@nestjs/common';
import * as turf from '@turf/turf';

import { normalizeOverpassElement, type Poi } from '@rahi/shared';

import { OverpassClient } from './overpass.client';
import { PoiCorridorRepository, type CorridorEntry } from './poi-corridor.repository';
import { PoiRepository } from './poi.repository';

const CORRIDOR_BUFFER_KM = 5;

/**
 * POI ingestion pipeline (Task 3.1/3.2, rahi-docs/07 §2). In production this runs
 * as a BullMQ job: buffer the route into a corridor, query Overpass across our
 * rider categories, normalise + upsert into `pois` (idempotent on osm identity),
 * then populate the trip-scoped `poi_corridor_sync` subset that syncs to the
 * device. Re-running is idempotent.
 */
@Injectable()
export class PoiIngestService {
  private readonly logger = new Logger(PoiIngestService.name);

  constructor(
    private readonly overpass: OverpassClient,
    private readonly pois: PoiRepository,
    private readonly corridor: PoiCorridorRepository,
  ) {}

  async run(input: { tripId: string; routeCoordinates: [number, number][] }): Promise<{
    ingested: number;
    corridor: number;
  }> {
    const line = turf.lineString(input.routeCoordinates);
    const buffered = turf.buffer(line, CORRIDOR_BUFFER_KM, { units: 'kilometers' });
    const ring = (buffered?.geometry.coordinates?.[0] ?? []) as [number, number][];
    if (ring.length === 0) return { ingested: 0, corridor: 0 };

    const elements = await this.overpass.queryCorridor(ring);
    const normalized = elements
      .map(normalizeOverpassElement)
      .filter((p): p is Poi => p !== null);

    const upserted = await this.pois.upsertMany(normalized);
    // Map OSM identity -> persisted id.
    const idByKey = new Map(upserted.map((r) => [`${r.osm_type}/${r.osm_id}`, r.id]));

    const entries: CorridorEntry[] = [];
    for (const p of normalized) {
      const poiId = idByKey.get(`${p.osm_type}/${p.osm_id}`);
      if (!poiId) continue;
      const distanceFromRouteM = turf.pointToLineDistance(turf.point([p.lng, p.lat]), line, {
        units: 'meters',
      });
      entries.push({
        poiId,
        category: p.category,
        name: p.name,
        lng: p.lng,
        lat: p.lat,
        tags: p.tags,
        distanceFromRouteM: Math.round(distanceFromRouteM),
      });
    }

    const corridor = await this.corridor.replaceForTrip(input.tripId, entries);
    this.logger.log(`Ingested ${upserted.length} POIs, ${corridor} in corridor for trip ${input.tripId}`);
    return { ingested: upserted.length, corridor };
  }
}
