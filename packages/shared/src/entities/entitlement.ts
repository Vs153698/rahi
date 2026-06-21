import { z } from 'zod';

import { ENTITLEMENT_GRACE_DAYS, PRO_ENTITLEMENT } from '../constants';

/**
 * Entitlement — the synced projection of a user's subscription state. Written
 * server-side from validated receipts / RevenueCat webhooks (Phase 5); in
 * Phase 0 it exists as a table shape + a stubbed (always-false) read.
 *
 * Conflict strategy: server-authoritative. The client never writes this table;
 * it is pull-only via sync rules and read through `useEntitlement`. The
 * `valid_until` + `last_validated_at` fields back the offline grace window
 * (rahi-docs/05, /09).
 */
export const EntitlementSchema = z.object({
  id: z.string().uuid(),
  owner_id: z.string().uuid(),
  entitlement: z.literal(PRO_ENTITLEMENT),
  is_active: z.boolean(),
  /** When the current paid period ends (store-reported). */
  valid_until: z.string().datetime().nullable(),
  /** Last time the server confirmed the receipt; anchors offline grace. */
  last_validated_at: z.string().datetime(),
  /** 'apple' | 'google' — which store granted it. */
  source: z.enum(['apple', 'google', 'stub']),
  updated_at: z.string().datetime(),
});

export type Entitlement = z.infer<typeof EntitlementSchema>;

/** Resolved client-side decision after applying the offline grace window. */
export interface EntitlementStatus {
  /** Whether Pro features should be unlocked right now. */
  active: boolean;
  /** True when active only because we're inside the offline grace window. */
  inGrace: boolean;
  /** ISO timestamp the entitlement (incl. grace) lapses, if known. */
  expiresAt: string | null;
}

const GRACE_MS = ENTITLEMENT_GRACE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Pure resolver for whether Pro should be unlocked, applying the offline grace
 * window: a previously-validated entitlement stays active for
 * ENTITLEMENT_GRACE_DAYS past its last server validation, so a paying rider
 * keeps Pro through a multi-day dead zone (rahi-docs/05, /09).
 *
 * Lives here (no RN/Node deps) so it is unit-testable and identical wherever
 * entitlement is evaluated. `is_active` is accepted as boolean|number because
 * SQLite stores booleans as 0/1.
 */
export function resolveEntitlementStatus(
  row: (Omit<Entitlement, 'is_active'> & { is_active: boolean | number }) | null,
  now: number = Date.now(),
): EntitlementStatus {
  if (!row) return { active: false, inGrace: false, expiresAt: null };

  const isActive = Boolean(row.is_active);
  const validUntilMs = row.valid_until ? Date.parse(row.valid_until) : null;
  const withinPaidPeriod = isActive && (validUntilMs === null || validUntilMs > now);
  if (withinPaidPeriod) {
    return { active: true, inGrace: false, expiresAt: row.valid_until };
  }

  const graceEnd = Date.parse(row.last_validated_at) + GRACE_MS;
  if (isActive && graceEnd > now) {
    return { active: true, inGrace: true, expiresAt: new Date(graceEnd).toISOString() };
  }

  return { active: false, inGrace: false, expiresAt: null };
}
