import { mapRevenueCatEvent, type RcEvent } from './revenuecat-events';

const NOW = Date.parse('2026-06-21T00:00:00.000Z');
const future = NOW + 30 * 24 * 60 * 60 * 1000;
const past = NOW - 1000;

const ev = (over: Partial<RcEvent>): RcEvent => ({
  type: 'INITIAL_PURCHASE',
  app_user_id: 'u1',
  store: 'APP_STORE',
  expiration_at_ms: future,
  ...over,
});

describe('mapRevenueCatEvent', () => {
  it('initial purchase (trial) → trial + active', () => {
    const d = mapRevenueCatEvent(ev({ period_type: 'TRIAL' }), NOW);
    expect(d.status).toBe('trial');
    expect(d.entitlementActive).toBe(true);
    expect(d.store).toBe('app_store');
  });

  it('renewal → active + willRenew', () => {
    const d = mapRevenueCatEvent(ev({ type: 'RENEWAL', store: 'PLAY_STORE' }), NOW);
    expect(d.status).toBe('active');
    expect(d.entitlementActive).toBe(true);
    expect(d.store).toBe('play_store');
    expect(d.willRenew).toBe(true);
  });

  it('cancellation keeps access until expiry, willRenew false', () => {
    const d = mapRevenueCatEvent(ev({ type: 'CANCELLATION' }), NOW);
    expect(d.status).toBe('cancelled');
    expect(d.entitlementActive).toBe(true);
    expect(d.willRenew).toBe(false);
  });

  it('billing issue → in_grace, still active during store grace', () => {
    const d = mapRevenueCatEvent(ev({ type: 'BILLING_ISSUE' }), NOW);
    expect(d.status).toBe('in_grace');
    expect(d.entitlementActive).toBe(true);
  });

  it('expiration → expired + inactive', () => {
    const d = mapRevenueCatEvent(ev({ type: 'EXPIRATION', expiration_at_ms: past }), NOW);
    expect(d.status).toBe('expired');
    expect(d.entitlementActive).toBe(false);
  });
});
