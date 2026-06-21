import { Injectable } from '@nestjs/common';

import { BaseRepository } from '../common/repositories/base.repository';
import type { RequestContext } from '../common/auth-context';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Trip-money persistence (Task 5.5). Records a verified Razorpay pay-in as a
 * `kitty_contribution`. Idempotent on `razorpay_payment_id` so a retried/double-
 * delivered webhook never double-credits the pool (rahi-docs/09 B1).
 */
@Injectable()
export class PaymentsRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  private async ensureKitty(groupId: string): Promise<string> {
    const { data } = await this.db
      .from('kitty')
      .select('id')
      .eq('group_id', groupId)
      .maybeSingle<{ id: string }>();
    if (data) return data.id;
    const { data: created, error } = await this.db
      .from('kitty')
      .insert({ group_id: groupId, balance_paise: 0 })
      .select('id')
      .single<{ id: string }>();
    if (error) throw error;
    return created.id;
  }

  /** Record a captured Razorpay contribution once; returns false if already recorded. */
  async recordContribution(
    ctx: RequestContext,
    params: { groupId: string; memberId: string; amountPaise: number; razorpayPaymentId: string },
  ): Promise<{ recorded: boolean }> {
    await this.assertGroupMember(ctx, params.groupId);

    // Idempotency guard.
    const { data: existing } = await this.db
      .from('kitty_contributions')
      .select('id')
      .eq('razorpay_payment_id', params.razorpayPaymentId)
      .maybeSingle<{ id: string }>();
    if (existing) return { recorded: false };

    const kittyId = await this.ensureKitty(params.groupId);
    const { error } = await this.db.from('kitty_contributions').insert({
      kitty_id: kittyId,
      member_id: params.memberId,
      amount_paise: params.amountPaise,
      method: 'razorpay',
      razorpay_payment_id: params.razorpayPaymentId,
      group_id: params.groupId,
    });
    if (error) throw error;
    return { recorded: true };
  }
}
