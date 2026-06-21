import { Injectable } from '@nestjs/common';

import type { RideStats } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import type { RequestContext } from '../common/auth-context';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Recap + badges persistence (Task 10.1/10.2). Server-authoritative (device reads
 * `recaps`/`badges` read-only). The poster render is a stub seam here; in
 * production a BullMQ job renders the track + photos to a poster on R2 and fills
 * `poster_r2_key`.
 */
@Injectable()
export class RecapRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async saveRecap(
    ctx: RequestContext,
    tripId: string,
    stats: RideStats,
    badgeKinds: string[],
  ): Promise<{ recapId: string; posterR2Key: string }> {
    await this.assertTripAccess(ctx, tripId);

    // TODO(phase-10-infra): enqueue the poster render job; for now record a key.
    const posterR2Key = `media/recaps/${tripId}.png`;

    const { data, error } = await this.db
      .from('recaps')
      .insert({ trip_id: tripId, poster_r2_key: posterR2Key, stats })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;

    if (badgeKinds.length > 0) {
      const rows = badgeKinds.map((kind) => ({ owner_id: ctx.userId, trip_id: tripId, kind }));
      const { error: badgeErr } = await this.db.from('badges').insert(rows);
      if (badgeErr) throw badgeErr;
    }

    return { recapId: data.id, posterR2Key };
  }
}
