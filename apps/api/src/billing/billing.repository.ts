import { Injectable } from '@nestjs/common';

import { PRO_ENTITLEMENT, type DerivedBilling } from '@rahi/shared';

import { BaseRepository } from '../common/repositories/base.repository';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Billing repository (Task 5.3). The server is authoritative on entitlement
 * (rahi-docs/09 A6): only this code (service role) writes `subscriptions` +
 * `entitlements` from validated RevenueCat events; the device reads the result
 * read-only and can never self-grant.
 */
@Injectable()
export class BillingRepository extends BaseRepository {
  constructor(supabase: SupabaseService) {
    super(supabase);
  }

  async applyDerivedBilling(
    ownerId: string,
    productId: string | null,
    rcCustomerId: string,
    derived: DerivedBilling,
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error: subErr } = await this.db.from('subscriptions').upsert(
      {
        owner_id: ownerId,
        rc_customer_id: rcCustomerId,
        product_id: productId,
        store: derived.store,
        status: derived.status,
        current_period_end: derived.expiresAt,
        will_renew: derived.willRenew,
        updated_at: now,
      },
      { onConflict: 'owner_id' },
    );
    if (subErr) throw subErr;

    const { error: entErr } = await this.db.from('entitlements').upsert(
      {
        owner_id: ownerId,
        entitlement: PRO_ENTITLEMENT,
        is_active: derived.entitlementActive,
        expires_at: derived.expiresAt,
        valid_until: derived.expiresAt,
        last_validated_at: now,
        source: 'subscription',
        updated_at: now,
      },
      { onConflict: 'owner_id,entitlement' },
    );
    if (entErr) throw entErr;
  }

  /** Audit trail of raw webhook events (never trusted over RC's validated state). */
  async recordReceipt(ownerId: string, eventType: string, raw: unknown): Promise<void> {
    await this.db.from('receipts').insert({
      owner_id: ownerId,
      store: null,
      rc_event_id: null,
      event_type: eventType,
      raw,
    });
  }
}
