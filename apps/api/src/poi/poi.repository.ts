import { Injectable } from '@nestjs/common';

import type { Poi } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * pois repository. Server-ingested, server-authoritative (read-only on device).
 * Upserts are idempotent on (osm_type, osm_id) so re-running ingestion never
 * duplicates (rahi-docs/07 §2). geography is written as EWKT, which PostGIS
 * accepts directly on a geography(Point,4326) column.
 */
@Injectable()
export class PoiRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  /** Upsert POIs idempotently; returns each row's id keyed by its OSM identity. */
  async upsertMany(pois: Poi[]): Promise<{ id: string; osm_type: string; osm_id: number }[]> {
    if (pois.length === 0) return [];
    const rows = pois.map((p) => ({
      osm_id: p.osm_id,
      osm_type: p.osm_type,
      category: p.category,
      name: p.name,
      geom: `SRID=4326;POINT(${p.lng} ${p.lat})`,
      tags: p.tags,
      source_updated_at: new Date().toISOString(),
    }));
    const { data, error } = await this.db
      .from('pois')
      .upsert(rows, { onConflict: 'osm_type,osm_id' })
      .select('id, osm_type, osm_id');
    if (error) throw error;
    return (data ?? []) as { id: string; osm_type: string; osm_id: number }[];
  }
}
