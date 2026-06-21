/**
 * Pure RevenueCat webhook event → server state mapper (rahi-docs/09 A3/A5, Task
 * 5.3). The server is authoritative: it derives the subscription status and the
 * resolved `pro` entitlement from each event and persists them; the device reads
 * the result (never self-grants). Keeping this pure makes the lifecycle testable.
 */
export type RcEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'UNCANCELLATION'
  | 'CANCELLATION'
  | 'BILLING_ISSUE'
  | 'EXPIRATION'
  | 'SUBSCRIPTION_PAUSED';

export type RcPeriodType = 'TRIAL' | 'INTRO' | 'NORMAL';
export type RcStore = 'APP_STORE' | 'PLAY_STORE' | 'MAC_APP_STORE' | 'STRIPE';

export interface RcEvent {
  type: RcEventType;
  app_user_id: string;
  product_id?: string;
  period_type?: RcPeriodType;
  store?: RcStore;
  /** Subscription expiry (epoch ms). */
  expiration_at_ms?: number;
}

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'in_grace'
  | 'on_hold'
  | 'cancelled'
  | 'expired';

export interface DerivedBilling {
  status: SubscriptionStatus;
  /** Whether the `pro` entitlement is currently active (server truth). */
  entitlementActive: boolean;
  expiresAt: string | null;
  store: 'app_store' | 'play_store' | null;
  willRenew: boolean;
}

function mapStore(store?: RcStore): DerivedBilling['store'] {
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'app_store';
  if (store === 'PLAY_STORE') return 'play_store';
  return null;
}

export function mapRevenueCatEvent(event: RcEvent, now: number = Date.now()): DerivedBilling {
  const expiresAtMs = event.expiration_at_ms ?? null;
  const notExpired = expiresAtMs == null || expiresAtMs > now;
  const expiresAt = expiresAtMs != null ? new Date(expiresAtMs).toISOString() : null;
  const store = mapStore(event.store);
  const isTrial = event.period_type === 'TRIAL';

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'PRODUCT_CHANGE':
    case 'UNCANCELLATION':
      return {
        status: isTrial ? 'trial' : 'active',
        entitlementActive: notExpired,
        expiresAt,
        store,
        willRenew: true,
      };
    case 'CANCELLATION':
      // Won't renew, but access continues until the paid period ends.
      return { status: 'cancelled', entitlementActive: notExpired, expiresAt, store, willRenew: false };
    case 'BILLING_ISSUE':
      // Dunning/grace at the store — keep access during the store grace period.
      return { status: 'in_grace', entitlementActive: notExpired, expiresAt, store, willRenew: true };
    case 'SUBSCRIPTION_PAUSED':
      return { status: 'on_hold', entitlementActive: false, expiresAt, store, willRenew: false };
    case 'EXPIRATION':
      return { status: 'expired', entitlementActive: false, expiresAt, store, willRenew: false };
    default: {
      const _never: never = event.type;
      return { status: 'expired', entitlementActive: false, expiresAt: null, store, willRenew: false };
    }
  }
}
