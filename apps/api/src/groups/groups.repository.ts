import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { generateInviteCode, normalizeInviteCode } from '@rahi/shared';

import type { RequestContext } from '../common/auth-context';
import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

export interface GroupRow {
  id: string;
  trip_id: string;
  name: string;
  invite_code: string;
}

/**
 * Groups repository (Task 7.1). Create generates a unique invite code and adds
 * the creator as `lead`; join looks a group up by code and adds the caller as a
 * `member`. Membership drives sync scope (rahi-docs/04 §7) — a user only pulls
 * data for groups they belong to.
 */
@Injectable()
export class GroupsRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async createGroup(ctx: RequestContext, tripId: string, name: string): Promise<GroupRow> {
    await this.assertTripAccess(ctx, tripId);

    // Retry a few times on the unlikely invite-code collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateInviteCode();
      const { data, error } = await this.db
        .from('groups')
        .insert({ trip_id: tripId, name, invite_code: code, created_by: ctx.userId })
        .select('id, trip_id, name, invite_code')
        .single<GroupRow>();
      if (!error && data) {
        await this.db.from('group_members').insert({
          group_id: data.id,
          profile_id: ctx.userId,
          role: 'lead',
        });
        return data;
      }
      if (error && !`${error.message}`.includes('invite_code')) throw error;
    }
    throw new ConflictException('Could not allocate an invite code, try again');
  }

  async joinByCode(ctx: RequestContext, code: string, bikeId?: string): Promise<GroupRow> {
    const normalized = normalizeInviteCode(code);
    const { data: group, error } = await this.db
      .from('groups')
      .select('id, trip_id, name, invite_code')
      .eq('invite_code', normalized)
      .is('deleted_at', null)
      .maybeSingle<GroupRow>();
    if (error) throw error;
    if (!group) throw new NotFoundException('No group found for that code');

    // Idempotent join (unique on group_id+profile_id).
    const { error: joinErr } = await this.db.from('group_members').upsert(
      { group_id: group.id, profile_id: ctx.userId, bike_id: bikeId ?? null, role: 'member' },
      { onConflict: 'group_id,profile_id' },
    );
    if (joinErr) throw joinErr;
    return group;
  }
}
