import { ENTITLEMENT_GRACE_DAYS } from '../constants';

import { resolveEntitlementStatus, type Entitlement } from './entitlement';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-06-20T12:00:00.000Z');

function row(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    owner_id: '00000000-0000-0000-0000-000000000002',
    entitlement: 'pro',
    is_active: true,
    valid_until: new Date(NOW + 30 * DAY).toISOString(),
    last_validated_at: new Date(NOW).toISOString(),
    source: 'apple',
    updated_at: new Date(NOW).toISOString(),
    ...overrides,
  };
}

describe('resolveEntitlementStatus', () => {
  it('is inactive when there is no entitlement row', () => {
    expect(resolveEntitlementStatus(null, NOW)).toEqual({
      active: false,
      inGrace: false,
      expiresAt: null,
    });
  });

  it('is active within the paid period (not in grace)', () => {
    const status = resolveEntitlementStatus(row(), NOW);
    expect(status.active).toBe(true);
    expect(status.inGrace).toBe(false);
  });

  it('stays active in grace for a multi-day offline window after expiry', () => {
    // Paid period ended yesterday, last validated 2 days ago.
    const status = resolveEntitlementStatus(
      row({
        valid_until: new Date(NOW - 1 * DAY).toISOString(),
        last_validated_at: new Date(NOW - 2 * DAY).toISOString(),
      }),
      NOW,
    );
    expect(status.active).toBe(true);
    expect(status.inGrace).toBe(true);
  });

  it('lapses once the grace window is exceeded', () => {
    const status = resolveEntitlementStatus(
      row({
        valid_until: new Date(NOW - (ENTITLEMENT_GRACE_DAYS + 5) * DAY).toISOString(),
        last_validated_at: new Date(NOW - (ENTITLEMENT_GRACE_DAYS + 1) * DAY).toISOString(),
      }),
      NOW,
    );
    expect(status.active).toBe(false);
    expect(status.inGrace).toBe(false);
  });

  it('is inactive when is_active is false regardless of dates', () => {
    expect(resolveEntitlementStatus(row({ is_active: false }), NOW).active).toBe(false);
  });

  it('accepts SQLite integer booleans (0/1) for is_active', () => {
    expect(resolveEntitlementStatus(row({ is_active: 1 as unknown as boolean }), NOW).active).toBe(
      true,
    );
    expect(resolveEntitlementStatus(row({ is_active: 0 as unknown as boolean }), NOW).active).toBe(
      false,
    );
  });
});
