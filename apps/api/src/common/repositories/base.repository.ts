import { ForbiddenException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseService } from '../../supabase/supabase.service';
import type { RequestContext } from '../auth-context';

/**
 * Base for all server-side repositories (rahi-docs/10). The repository is the
 * ONLY layer permitted to touch the database — the `no-direct-db-write-outside-repo`
 * lint rule enforces this (promoted to error in Phase 1). Feature services call
 * repositories; repositories apply the caller's user/group context so a request
 * can never read or write another user's rows.
 *
 * Uses the service-role client (bypasses RLS) but ALWAYS constrains queries with
 * an explicit owner/group predicate derived from the verified JWT — RLS remains
 * on as defense-in-depth (rahi-docs/05 §2).
 */
export abstract class BaseRepository {
  constructor(protected readonly supabase: SupabaseService) {}

  protected get db(): SupabaseClient {
    return this.supabase.client;
  }

  /** Assert the caller may act on a trip (owner or group member). */
  protected async assertTripAccess(ctx: RequestContext, tripId: string): Promise<void> {
    const { data, error } = await this.db
      .rpc('can_access_trip', { p_trip_id: tripId, p_uid: ctx.userId })
      .single<boolean>();
    if (error || data !== true) {
      throw new ForbiddenException('No access to this trip');
    }
  }

  /** Assert the caller belongs to a group. */
  protected async assertGroupMember(ctx: RequestContext, groupId: string): Promise<void> {
    const { data, error } = await this.db
      .rpc('is_group_member', { p_group_id: groupId, p_uid: ctx.userId })
      .single<boolean>();
    if (error || data !== true) {
      throw new ForbiddenException('Not a member of this group');
    }
  }
}
