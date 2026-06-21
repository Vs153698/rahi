import { Injectable } from '@nestjs/common';

import type { PoiCategory } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

export interface CorridorEntry {
  poiId: string;
  category: PoiCategory;
  name: string | null;
  lng: number;
  lat: number;
  tags: Record<string, string>;
  distanceFromRouteM: number;
}

/**
 * poi_corridor_sync repository. Server-authoritative; carries the denormalized
 * POI display fields so the device syncs corridor POIs from one trip-scoped table
 * (rahi-docs/05 §2). Re-running for a trip replaces its corridor set (idempotent).
 */
@Injectable()
export class PoiCorridorRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async replaceForTrip(tripId: string, entries: CorridorEntry[]): Promise<number> {
    // Clear the trip's existing corridor set, then insert the fresh one.
    const { error: delErr } = await this.db
      .from('poi_corridor_sync')
      .delete()
      .eq('trip_id', tripId);
    if (delErr) throw delErr;

    if (entries.length === 0) return 0;
    const rows = entries.map((e) => ({
      trip_id: tripId,
      poi_id: e.poiId,
      distance_from_route_m: e.distanceFromRouteM,
      category: e.category,
      name: e.name,
      geom: `SRID=4326;POINT(${e.lng} ${e.lat})`,
      tags: e.tags,
    }));
    const { error } = await this.db.from('poi_corridor_sync').insert(rows);
    if (error) throw error;
    return rows.length;
  }
}
