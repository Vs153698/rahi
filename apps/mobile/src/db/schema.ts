import { column, Schema, Table } from '@powersync/react-native';

import { SYNC_TABLES } from '@rahi/shared';

/**
 * Local SQLite schema managed by PowerSync — a STRICT SUBSET of the Postgres
 * schema (apps/api/migrations/0002), mirroring only the columns the device
 * needs. Column names match Postgres so sync is a straight projection
 * (rahi-docs/05 §2).
 *
 * Type mapping: timestamptz/uuid/geography -> text; booleans -> integer (0/1);
 * money (paise) -> integer; numerics -> real. geography is stored as text
 * (GeoJSON/WKT) locally; proximity math uses turf on the parsed value.
 *
 * Conflict strategy per table is declared in rahi-docs/05 §3 and enforced in the
 * write paths (packages/shared/src/merge + repositories).
 */

// --- user bucket ---
const profiles = new Table({
  phone: column.text,
  display_name: column.text,
  home_region: column.text,
  default_language: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const bikes = new Table({
  owner_id: column.text,
  name: column.text,
  make_model: column.text,
  tank_litres: column.real,
  baseline_kmpl: column.real,
  odometer_km: column.integer,
  client_updated_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const emergency_contacts = new Table({
  owner_id: column.text,
  name: column.text,
  phone: column.text,
  relationship: column.text,
  is_primary: column.integer,
  client_updated_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const trips = new Table({
  owner_id: column.text,
  title: column.text,
  start_point: column.text,
  end_point: column.text,
  planned_route_id: column.text,
  status: column.text,
  started_at: column.text,
  ended_at: column.text,
  client_updated_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const fuel_logs = new Table({
  bike_id: column.text,
  trip_id: column.text,
  litres: column.real,
  odometer_km: column.integer,
  price_paise: column.integer,
  logged_at: column.text,
  updated_at: column.text,
});

const sos_events = new Table({
  owner_id: column.text,
  trip_id: column.text,
  kind: column.text,
  geom: column.text,
  delivery: column.text,
  created_at: column.text,
  resolved_at: column.text,
  updated_at: column.text,
});

const documents = new Table({
  owner_id: column.text,
  doc_type: column.text,
  r2_key: column.text,
  encrypted: column.integer,
  expires_on: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const badges = new Table({
  owner_id: column.text,
  trip_id: column.text,
  kind: column.text,
  awarded_at: column.text,
});

const subscriptions = new Table({
  owner_id: column.text,
  product_id: column.text,
  store: column.text,
  status: column.text,
  current_period_end: column.text,
  will_renew: column.integer,
  started_at: column.text,
  updated_at: column.text,
});

const entitlements = new Table({
  owner_id: column.text,
  entitlement: column.text,
  is_active: column.integer,
  valid_until: column.text,
  expires_at: column.text,
  last_validated_at: column.text,
  source: column.text,
  updated_at: column.text,
});

// --- group bucket ---
const groups = new Table({
  trip_id: column.text,
  name: column.text,
  invite_code: column.text,
  created_by: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const group_members = new Table({
  group_id: column.text,
  profile_id: column.text,
  bike_id: column.text,
  role: column.text,
  joined_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const expenses = new Table({
  trip_id: column.text,
  group_id: column.text,
  created_by: column.text,
  paid_by: column.text,
  amount_paise: column.integer,
  currency: column.text,
  category: column.text,
  note: column.text,
  occurred_at: column.text,
  split_type: column.text,
  merge_version: column.integer,
  client_updated_at: column.text,
  updated_at: column.text,
  deleted_at: column.text,
});

const expense_shares = new Table({
  expense_id: column.text,
  member_id: column.text,
  share_paise: column.integer,
  group_id: column.text,
  updated_at: column.text,
});

const kitty = new Table({
  group_id: column.text,
  balance_paise: column.integer,
  updated_at: column.text,
});

const kitty_contributions = new Table({
  kitty_id: column.text,
  member_id: column.text,
  amount_paise: column.integer,
  method: column.text,
  razorpay_payment_id: column.text,
  occurred_at: column.text,
  group_id: column.text,
  updated_at: column.text,
});

const settlements = new Table({
  group_id: column.text,
  from_member: column.text,
  to_member: column.text,
  amount_paise: column.integer,
  status: column.text,
  upi_ref: column.text,
  client_updated_at: column.text,
  updated_at: column.text,
});

const routes = new Table({
  trip_id: column.text,
  geometry: column.text,
  corridor: column.text,
  distance_km: column.real,
  instructions: column.text,
  computed_at: column.text,
  engine_version: column.text,
  updated_at: column.text,
});

const tile_packs = new Table({
  trip_id: column.text,
  bbox: column.text,
  zoom_min: column.integer,
  zoom_max: column.integer,
  pmtiles_url: column.text,
  size_bytes: column.integer,
  status: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const poi_corridor_sync = new Table({
  trip_id: column.text,
  poi_id: column.text,
  distance_from_route_m: column.real,
  // denormalized POI display fields (migration 0004) so corridor POIs sync from
  // this single trip-scoped table.
  category: column.text,
  name: column.text,
  geom: column.text,
  tags: column.text,
  updated_at: column.text,
});

const track_points = new Table({
  trip_id: column.text,
  geom: column.text,
  altitude_m: column.real,
  speed_kmh: column.real,
  recorded_at: column.text,
});

const recaps = new Table({
  trip_id: column.text,
  poster_r2_key: column.text,
  stats: column.text,
  generated_at: column.text,
});

// --- local-only (NOT synced): Phase 0 notes demo + offline entitlement cache ---
// Kept local for the dev demo; not present in sync rules. The entitlement cache
// backs offline grace (rahi-docs/05 §7b) and never syncs upstream.
const notes = new Table({
  owner_id: column.text,
  body: column.text,
  created_at: column.text,
  updated_at: column.text,
});

const entitlement_cache_meta = new Table(
  {
    entitlement: column.text,
    active: column.integer, // last known validated state (0/1)
    last_validated_at: column.text,
    grace_until: column.text,
  },
  { localOnly: true },
);

export const AppSchema = new Schema({
  [SYNC_TABLES.profiles]: profiles,
  [SYNC_TABLES.bikes]: bikes,
  [SYNC_TABLES.emergency_contacts]: emergency_contacts,
  [SYNC_TABLES.trips]: trips,
  [SYNC_TABLES.fuel_logs]: fuel_logs,
  [SYNC_TABLES.sos_events]: sos_events,
  [SYNC_TABLES.documents]: documents,
  [SYNC_TABLES.badges]: badges,
  [SYNC_TABLES.subscriptions]: subscriptions,
  [SYNC_TABLES.entitlements]: entitlements,
  [SYNC_TABLES.groups]: groups,
  [SYNC_TABLES.group_members]: group_members,
  [SYNC_TABLES.expenses]: expenses,
  [SYNC_TABLES.expense_shares]: expense_shares,
  [SYNC_TABLES.kitty]: kitty,
  [SYNC_TABLES.kitty_contributions]: kitty_contributions,
  [SYNC_TABLES.settlements]: settlements,
  [SYNC_TABLES.routes]: routes,
  [SYNC_TABLES.tile_packs]: tile_packs,
  [SYNC_TABLES.poi_corridor_sync]: poi_corridor_sync,
  [SYNC_TABLES.track_points]: track_points,
  [SYNC_TABLES.recaps]: recaps,
  notes,
  entitlement_cache_meta,
});

export type Database = (typeof AppSchema)['types'];
