import { Injectable } from '@nestjs/common';

import type { ComputedRoute } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import type { RequestContext } from '../common/auth-context';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * routes repository. Server-authoritative (read-only on device). Writes the
 * computed geometry, buffered corridor polygon, distance and cached turn
 * instructions; the device syncs these for offline voice nav (rahi-docs/07 §3).
 */
@Injectable()
export class RoutesRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async upsertForTrip(
    ctx: RequestContext,
    tripId: string,
    route: ComputedRoute,
    corridorGeoJson: unknown,
    engineVersion: string,
  ): Promise<string> {
    await this.assertTripAccess(ctx, tripId);
    const geometry = { type: 'LineString', coordinates: route.coordinates };
    const { data, error } = await this.db
      .from('routes')
      .insert({
        trip_id: tripId,
        geometry,
        corridor: corridorGeoJson,
        distance_km: route.distanceKm,
        instructions: route.instructions,
        computed_at: new Date().toISOString(),
        engine_version: engineVersion,
      })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return data.id;
  }
}
