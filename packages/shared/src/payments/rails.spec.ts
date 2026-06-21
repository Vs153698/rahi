import { assertRail, isRailAllowed, RailViolationError } from './rails';

describe('payment rail separation (rahi-docs/09 Part C)', () => {
  it('subscription is allowed ONLY through store IAP', () => {
    expect(isRailAllowed('subscription', 'store_iap')).toBe(true);
    expect(isRailAllowed('subscription', 'razorpay')).toBe(false);
    expect(isRailAllowed('subscription', 'upi')).toBe(false);
  });

  it('trip money is allowed ONLY through razorpay / upi', () => {
    expect(isRailAllowed('trip_money', 'razorpay')).toBe(true);
    expect(isRailAllowed('trip_money', 'upi')).toBe(true);
    expect(isRailAllowed('trip_money', 'store_iap')).toBe(false);
  });

  it('assertRail throws when a rail is crossed', () => {
    expect(() => assertRail('subscription', 'upi')).toThrow(RailViolationError);
    expect(() => assertRail('trip_money', 'store_iap')).toThrow(RailViolationError);
    expect(() => assertRail('subscription', 'store_iap')).not.toThrow();
    expect(() => assertRail('trip_money', 'razorpay')).not.toThrow();
  });
});
