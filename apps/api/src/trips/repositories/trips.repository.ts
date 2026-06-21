import { Injectable } from '@nestjs/common';

import type { RequestContext } from '../../common/auth-context';
import { BaseRepository } from '../../common/repositories/base.repository';
import { SupabaseService } from '../../supabase/supabase.service';

export interface TripRow {
  id: string;
  owner_id: string;
  title: string;
  status: 'planned' | 'active' | 'completed';
  updated_at: string;
}

/**
 * Trips repository. All access is scoped to the caller — listing returns only
 * the user's own trips plus trips of groups they belong to (matching the sync
 * rules in packages/sync-rules). owner_id is set from the JWT, never the body.
 */
@Injectable()
export class TripsRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async listForUser(ctx: RequestContext): Promise<TripRow[]> {
    // Owned trips. Group trips are pulled via sync rules on-device; the API list
    // here intentionally returns owned trips (server actions operate on those).
    const { data, error } = await this.db
      .from('trips')
      .select('id, owner_id, title, status, updated_at')
      .eq('owner_id', ctx.userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as TripRow[];
  }

  async create(ctx: RequestContext, input: { title: string }): Promise<TripRow> {
    const { data, error } = await this.db
      .from('trips')
      .insert({ owner_id: ctx.userId, title: input.title, status: 'planned' })
      .select('id, owner_id, title, status, updated_at')
      .single<TripRow>();
    if (error) throw error;
    return data;
  }
}
