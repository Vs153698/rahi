import { Injectable } from '@nestjs/common';

import type { ModerationStatus } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Admin moderation of hazard reports (Task 9.4, rahi-docs/10). The crowd
 * auto-hides reports past the flag threshold (client-derived); admins review the
 * queue and make the final call. Service-role only — gated behind an admin check
 * in the controller.
 */
export interface ReviewItem {
  id: string;
  kind: string;
  note: string | null;
  confirmations: number;
  flag_count: number;
  moderation_status: ModerationStatus;
  created_at: string;
}

@Injectable()
export class ModerationRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  /** Reports awaiting review (flagged / auto-hidden). */
  async reviewQueue(): Promise<ReviewItem[]> {
    const { data, error } = await this.db
      .from('hazard_reports')
      .select('id, kind, note, confirmations, flag_count, moderation_status, created_at')
      .in('moderation_status', ['under_review'])
      .order('flag_count', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ReviewItem[];
  }

  /** Final admin decision: restore (visible) or remove. */
  async resolve(id: string, decision: 'visible' | 'removed'): Promise<void> {
    const { error } = await this.db
      .from('hazard_reports')
      .update({ moderation_status: decision, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }
}
