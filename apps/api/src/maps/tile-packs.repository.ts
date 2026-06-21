import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

export interface TilePackRecord {
  id: string;
  trip_id: string;
  bbox_geojson: unknown;
  zoom_min: number;
  zoom_max: number;
  pmtiles_url: string | null;
  size_bytes: number | null;
  status: 'pending' | 'ready' | 'failed';
}

/**
 * tile_packs repository. The table is server-authoritative (read-only on device),
 * so only the service role writes it — from the generation job below. Pack
 * metadata then syncs to members of the trip's group (rahi-docs/04 §7).
 */
@Injectable()
export class TilePacksRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async createPending(input: {
    tripId: string;
    bboxGeoJson: unknown;
    zoomMin: number;
    zoomMax: number;
  }): Promise<string> {
    const { data, error } = await this.db
      .from('tile_packs')
      .insert({
        trip_id: input.tripId,
        bbox: input.bboxGeoJson,
        zoom_min: input.zoomMin,
        zoom_max: input.zoomMax,
        status: 'pending',
      })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }

  async markReady(id: string, pmtilesUrl: string, sizeBytes: number): Promise<void> {
    const { error } = await this.db
      .from('tile_packs')
      .update({ pmtiles_url: pmtilesUrl, size_bytes: sizeBytes, status: 'ready' })
      .eq('id', id);
    if (error) throw error;
  }

  async markFailed(id: string): Promise<void> {
    const { error } = await this.db.from('tile_packs').update({ status: 'failed' }).eq('id', id);
    if (error) throw error;
  }
}
