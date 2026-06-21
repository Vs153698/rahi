// Cross-cutting constants shared by app + API. Pricing/economics are tuned for
// India (see rahi-docs/14); values are V1 and may change — reconcile against
// live store/provider pages before committing (rahi-docs/13 §honest notes).

/** The one entitlement that gates the offline suite. */
export const PRO_ENTITLEMENT = 'pro' as const;

/** Subscription product identifiers (configured in App Store Connect / Play). */
export const PRODUCTS = {
  proMonthly: 'pro_monthly',
  proAnnual: 'pro_annual',
} as const;

/** Plan tiers. */
export const PLAN = {
  free: 'free',
  pro: 'pro',
} as const;
export type Plan = (typeof PLAN)[keyof typeof PLAN];

/**
 * Offline entitlement grace window. A subscription cannot be validated while
 * offline, so a verified `pro` entitlement is cached and honoured for a bounded
 * window after the last successful validation (rahi-docs/05, /09). Don't ship
 * without this or paying riders lose Pro mid-trip.
 */
export const ENTITLEMENT_GRACE_DAYS = 14 as const;

/** Free trial length surfaced in the paywall (configured store-side too). */
export const TRIAL_DAYS = 7 as const;

/** Supported V1 locales (rahi-docs/01). */
export const LOCALES = ['en', 'hi', 'hi-en'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * Names of PowerSync-synced tables. Keep in lockstep with packages/sync-rules
 * and the local SQLite schema (apps/mobile/src/db/schema.ts). The local schema
 * must be a strict subset of these (rahi-docs/05 §2).
 */
export const SYNC_TABLES = {
  // user bucket
  profiles: 'profiles',
  bikes: 'bikes',
  emergency_contacts: 'emergency_contacts',
  trips: 'trips',
  fuel_logs: 'fuel_logs',
  sos_events: 'sos_events',
  documents: 'documents',
  badges: 'badges',
  subscriptions: 'subscriptions',
  entitlements: 'entitlements',
  // group bucket
  groups: 'groups',
  group_members: 'group_members',
  expenses: 'expenses',
  expense_shares: 'expense_shares',
  kitty: 'kitty',
  kitty_contributions: 'kitty_contributions',
  settlements: 'settlements',
  routes: 'routes',
  tile_packs: 'tile_packs',
  poi_corridor_sync: 'poi_corridor_sync',
  track_points: 'track_points',
  recaps: 'recaps',
} as const;
export type SyncTableName = (typeof SYNC_TABLES)[keyof typeof SYNC_TABLES];

/** Tables the device may write. Everything else is pull-only (rahi-docs/05 §3). */
export const WRITABLE_SYNC_TABLES: readonly SyncTableName[] = [
  SYNC_TABLES.profiles,
  SYNC_TABLES.bikes,
  SYNC_TABLES.emergency_contacts,
  SYNC_TABLES.trips,
  SYNC_TABLES.fuel_logs,
  SYNC_TABLES.sos_events,
  SYNC_TABLES.documents,
  SYNC_TABLES.groups,
  SYNC_TABLES.group_members,
  SYNC_TABLES.expenses,
  SYNC_TABLES.expense_shares,
  SYNC_TABLES.kitty,
  SYNC_TABLES.kitty_contributions,
  SYNC_TABLES.settlements,
  SYNC_TABLES.track_points,
] as const;
