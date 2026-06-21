-- 0002_phase1_schema.sql
-- Phase 1 Task 1.1 — full data schema (rahi-docs/04). Sync-shaped: every
-- user-mutable table carries id (UUID v7), updated_at, client_updated_at,
-- deleted_at (soft delete), and owner_id/group_id for sync-rule scoping.
--
-- Conventions:
--   * UUID v7 PKs (sortable, offline-generatable) via uuid_generate_v7().
--   * timestamptz everywhere; money in paise (bigint); geography(...,4326).
--   * GIST on geography proximity columns; btree on FKs + updated_at (sync cursors).
--   * track_points + coverage_samples are RANGE-partitioned by month (high volume).
--   * RLS scopes rows to the owner or their group membership.
-- Conflict strategy per table is documented inline and in rahi-docs/05 §3.

-- =============================================================================
-- 0. Helpers
-- =============================================================================

-- UUID v7 (time-ordered). Postgres < 18 has no native gen; this is a standard
-- plpgsql implementation. Clients generate v7 offline too (same layout).
create or replace function public.uuid_generate_v7()
returns uuid language plpgsql parallel safe as $$
declare
  unix_ts_ms bytea;
  uuid_bytes bytea;
begin
  unix_ts_ms := substring(int8send((extract(epoch from clock_timestamp()) * 1000)::bigint) from 3);
  uuid_bytes := unix_ts_ms || gen_random_bytes(10);
  -- version 7
  uuid_bytes := set_byte(uuid_bytes, 6, (b'0111' || get_byte(uuid_bytes, 6)::bit(4))::bit(8)::int);
  -- variant 10xx
  uuid_bytes := set_byte(uuid_bytes, 8, (b'10' || get_byte(uuid_bytes, 8)::bit(6))::bit(8)::int);
  return encode(uuid_bytes, 'hex')::uuid;
end;
$$;

-- updated_at bump (re-declared idempotently; also created in 0001).
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Group-membership predicate used by RLS. SECURITY DEFINER so the policy can
-- check membership without recursive RLS on group_members.
create or replace function public.is_group_member(p_group_id uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.profile_id = p_uid and gm.deleted_at is null
  );
$$;

-- Convenience: trip is visible to a user if they own it or belong to its group.
create or replace function public.can_access_trip(p_trip_id uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trips t where t.id = p_trip_id and t.owner_id = p_uid
  ) or exists (
    select 1
    from public.groups g
    join public.group_members gm on gm.group_id = g.id
    where g.trip_id = p_trip_id and gm.profile_id = p_uid and gm.deleted_at is null
  );
$$;

-- =============================================================================
-- 1. Identity & membership
-- =============================================================================

create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  phone            text,
  display_name     text,
  home_region      text,
  default_language text not null default 'en' check (default_language in ('en','hi','hi-en')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.bikes (
  id            uuid primary key default public.uuid_generate_v7(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  make_model    text,
  tank_litres   numeric(5,2),
  baseline_kmpl numeric(5,2),
  odometer_km   integer,
  client_updated_at timestamptz,
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index if not exists bikes_owner_idx on public.bikes (owner_id);
create index if not exists bikes_updated_idx on public.bikes (updated_at);

create table if not exists public.emergency_contacts (
  id           uuid primary key default public.uuid_generate_v7(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  phone        text not null,
  relationship text,
  is_primary   boolean not null default false,
  client_updated_at timestamptz,
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create index if not exists emergency_contacts_owner_idx on public.emergency_contacts (owner_id);

-- =============================================================================
-- 2. Trips & groups
-- =============================================================================

create table if not exists public.trips (
  id               uuid primary key default public.uuid_generate_v7(),
  owner_id         uuid not null references public.profiles (id) on delete cascade,
  title            text not null,
  start_point      geography(Point, 4326),
  end_point        geography(Point, 4326),
  planned_route_id uuid,
  status           text not null default 'planned' check (status in ('planned','active','completed')),
  started_at       timestamptz,
  ended_at         timestamptz,
  client_updated_at timestamptz,
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);
create index if not exists trips_owner_idx on public.trips (owner_id);
create index if not exists trips_updated_idx on public.trips (updated_at);

create table if not exists public.groups (
  id          uuid primary key default public.uuid_generate_v7(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null references public.profiles (id),
  client_updated_at timestamptz,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index if not exists groups_trip_idx on public.groups (trip_id);

create table if not exists public.group_members (
  id         uuid primary key default public.uuid_generate_v7(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  bike_id    uuid references public.bikes (id),
  role       text not null default 'member' check (role in ('lead','sweep','member')),
  joined_at  timestamptz not null default now(),
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (group_id, profile_id)
);
create index if not exists group_members_group_idx on public.group_members (group_id);
create index if not exists group_members_profile_idx on public.group_members (profile_id);

-- FK from trips.planned_route_id added after routes exists (below).

-- =============================================================================
-- 3. Routes, tiles, POIs (geo) — server-authoritative; device reads only
-- =============================================================================

create table if not exists public.routes (
  id             uuid primary key default public.uuid_generate_v7(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  geometry       geography(LineString, 4326),
  corridor       geography(Polygon, 4326),
  distance_km    numeric(8,2),
  instructions   jsonb,
  computed_at    timestamptz,
  engine_version text,
  updated_at     timestamptz not null default now()
);
create index if not exists routes_trip_idx on public.routes (trip_id);
create index if not exists routes_geometry_gist on public.routes using gist (geometry);
create index if not exists routes_corridor_gist on public.routes using gist (corridor);

alter table public.trips
  drop constraint if exists trips_planned_route_fk,
  add constraint trips_planned_route_fk
    foreign key (planned_route_id) references public.routes (id) on delete set null;

create table if not exists public.tile_packs (
  id          uuid primary key default public.uuid_generate_v7(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  bbox        geography(Polygon, 4326),
  zoom_min    integer,
  zoom_max    integer,
  pmtiles_url text,
  size_bytes  bigint,
  status      text not null default 'pending' check (status in ('pending','ready','failed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tile_packs_trip_idx on public.tile_packs (trip_id);

create table if not exists public.pois (
  id                uuid primary key default public.uuid_generate_v7(),
  osm_id            bigint,
  osm_type          text check (osm_type in ('node','way','relation')),
  category          text not null check (category in
                      ('fuel','mechanic','puncture','hospital','atm','police','food','dhaba','homestay','water','viewpoint','other')),
  name              text,
  geom              geography(Point, 4326) not null,
  tags              jsonb,
  source_updated_at timestamptz,
  ingested_at       timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists pois_geom_gist on public.pois using gist (geom);
create index if not exists pois_category_idx on public.pois (category);
create unique index if not exists pois_osm_unique on public.pois (osm_type, osm_id) where osm_id is not null;

create table if not exists public.poi_corridor_sync (
  id                     uuid primary key default public.uuid_generate_v7(),
  trip_id                uuid not null references public.trips (id) on delete cascade,
  poi_id                 uuid not null references public.pois (id) on delete cascade,
  distance_from_route_m  numeric(10,2),
  updated_at             timestamptz not null default now(),
  unique (trip_id, poi_id)
);
create index if not exists poi_corridor_trip_idx on public.poi_corridor_sync (trip_id);

-- =============================================================================
-- 4. Money (offline-first, merge-sensitive) — rahi-docs/05 §4
-- =============================================================================

create table if not exists public.expenses (
  id           uuid primary key default public.uuid_generate_v7(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  group_id     uuid references public.groups (id) on delete cascade,
  created_by   uuid not null references public.profiles (id),
  paid_by      uuid references public.group_members (id),
  amount_paise bigint not null check (amount_paise >= 0),
  currency     text not null default 'INR' check (currency = 'INR'),
  category     text,
  note         text,
  occurred_at  timestamptz,
  split_type   text not null default 'equal' check (split_type in ('equal','custom','by_distance','per_bike')),
  -- CRDT merge controls (rahi-docs/05 §4): highest merge_version wins per field,
  -- ties broken on client_updated_at then created_by.
  merge_version     integer not null default 0,
  client_updated_at timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);
create index if not exists expenses_trip_idx on public.expenses (trip_id);
create index if not exists expenses_group_idx on public.expenses (group_id);
create index if not exists expenses_updated_idx on public.expenses (updated_at);

create table if not exists public.expense_shares (
  id          uuid primary key default public.uuid_generate_v7(),
  expense_id  uuid not null references public.expenses (id) on delete cascade,
  member_id   uuid not null references public.group_members (id) on delete cascade,
  share_paise bigint not null check (share_paise >= 0),
  -- denormalized for sync-rule scoping (rahi-docs/04 intro: child tables carry
  -- group_id so PowerSync buckets can scope them without joins).
  group_id    uuid references public.groups (id) on delete cascade,
  updated_at  timestamptz not null default now(),
  unique (expense_id, member_id)
);
create index if not exists expense_shares_expense_idx on public.expense_shares (expense_id);
create index if not exists expense_shares_group_idx on public.expense_shares (group_id);

create table if not exists public.kitty (
  id            uuid primary key default public.uuid_generate_v7(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  balance_paise bigint not null default 0, -- derived = sum(contributions) - spent
  updated_at    timestamptz not null default now(),
  unique (group_id)
);

create table if not exists public.kitty_contributions (
  id                  uuid primary key default public.uuid_generate_v7(),
  kitty_id            uuid not null references public.kitty (id) on delete cascade,
  member_id           uuid not null references public.group_members (id),
  amount_paise        bigint not null check (amount_paise >= 0),
  method              text not null check (method in ('cash','upi','razorpay')),
  razorpay_payment_id text,
  occurred_at         timestamptz not null default now(),
  -- denormalized for sync-rule scoping (see expense_shares note).
  group_id            uuid references public.groups (id) on delete cascade,
  updated_at          timestamptz not null default now()
);
create index if not exists kitty_contributions_kitty_idx on public.kitty_contributions (kitty_id);
create index if not exists kitty_contributions_group_idx on public.kitty_contributions (group_id);

create table if not exists public.settlements (
  id          uuid primary key default public.uuid_generate_v7(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  from_member uuid not null references public.group_members (id),
  to_member   uuid not null references public.group_members (id),
  amount_paise bigint not null check (amount_paise >= 0),
  -- monotonic state machine: pending -> marked_paid -> confirmed (rahi-docs/05 §3)
  status      text not null default 'pending' check (status in ('pending','marked_paid','confirmed')),
  upi_ref     text,
  client_updated_at timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists settlements_group_idx on public.settlements (group_id);

-- =============================================================================
-- 5. Safety & telemetry
-- =============================================================================

create table if not exists public.fuel_logs (
  id          uuid primary key default public.uuid_generate_v7(),
  bike_id     uuid not null references public.bikes (id) on delete cascade,
  trip_id     uuid references public.trips (id) on delete set null,
  litres      numeric(5,2) not null,
  odometer_km integer not null,
  price_paise bigint,
  logged_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fuel_logs_bike_idx on public.fuel_logs (bike_id);

-- track_points — high volume, immutable append, RANGE-partitioned by month.
create table if not exists public.track_points (
  id          uuid not null default public.uuid_generate_v7(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  geom        geography(Point, 4326) not null,
  altitude_m  numeric(7,2),
  speed_kmh   numeric(6,2),
  recorded_at timestamptz not null,
  primary key (id, recorded_at)
) partition by range (recorded_at);
create index if not exists track_points_trip_idx on public.track_points (trip_id);
create index if not exists track_points_geom_gist on public.track_points using gist (geom);
-- Seed partitions (extend via a scheduled job; rahi-docs/04 §8).
create table if not exists public.track_points_2026_06 partition of public.track_points
  for values from ('2026-06-01') to ('2026-07-01');
create table if not exists public.track_points_2026_07 partition of public.track_points
  for values from ('2026-07-01') to ('2026-08-01');
create table if not exists public.track_points_default partition of public.track_points default;

create table if not exists public.sos_events (
  id          uuid primary key default public.uuid_generate_v7(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  trip_id     uuid references public.trips (id) on delete set null,
  kind        text not null check (kind in ('crash_detected','manual','deadman_timeout')),
  geom        geography(Point, 4326),
  delivery    jsonb,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists sos_events_owner_idx on public.sos_events (owner_id);

create table if not exists public.hazard_reports (
  id                uuid primary key default public.uuid_generate_v7(),
  reported_by       uuid not null references public.profiles (id),
  trip_id           uuid references public.trips (id) on delete set null,
  geom              geography(Point, 4326) not null,
  kind              text not null check (kind in ('landslide','washout','bad_road','diversion','other')),
  note              text,
  -- additive counters; counter-merge on sync (rahi-docs/05 §3)
  confirmations     integer not null default 0,
  flag_count        integer not null default 0,
  moderation_status text not null default 'visible' check (moderation_status in ('visible','under_review','removed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists hazard_reports_geom_gist on public.hazard_reports using gist (geom);

-- coverage_samples — high volume, immutable append, partitioned by month.
create table if not exists public.coverage_samples (
  id             uuid not null default public.uuid_generate_v7(),
  geom           geography(Point, 4326) not null,
  signal_dbm     integer,
  network_type   text,
  sampled_at     timestamptz not null,
  contributed_by uuid,
  primary key (id, sampled_at)
) partition by range (sampled_at);
create index if not exists coverage_samples_geom_gist on public.coverage_samples using gist (geom);
create table if not exists public.coverage_samples_2026_06 partition of public.coverage_samples
  for values from ('2026-06-01') to ('2026-07-01');
create table if not exists public.coverage_samples_2026_07 partition of public.coverage_samples
  for values from ('2026-07-01') to ('2026-08-01');
create table if not exists public.coverage_samples_default partition of public.coverage_samples default;

-- =============================================================================
-- 6. Documents & content
-- =============================================================================

create table if not exists public.documents (
  id         uuid primary key default public.uuid_generate_v7(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  doc_type   text not null check (doc_type in ('dl','rc','insurance','puc','permit','other')),
  r2_key     text not null,
  encrypted  boolean not null default true,
  expires_on date,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists documents_owner_idx on public.documents (owner_id);

create table if not exists public.recaps (
  id             uuid primary key default public.uuid_generate_v7(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  poster_r2_key  text,
  stats          jsonb,
  generated_at   timestamptz not null default now()
);
create index if not exists recaps_trip_idx on public.recaps (trip_id);

create table if not exists public.badges (
  id         uuid primary key default public.uuid_generate_v7(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  trip_id    uuid references public.trips (id) on delete set null,
  kind       text not null,
  awarded_at timestamptz not null default now()
);
create index if not exists badges_owner_idx on public.badges (owner_id);

-- =============================================================================
-- 6b. Subscriptions & entitlements — server-authoritative; device reads only
-- =============================================================================

create table if not exists public.subscriptions (
  id                 uuid primary key default public.uuid_generate_v7(),
  owner_id           uuid not null references public.profiles (id) on delete cascade,
  rc_customer_id     text,
  product_id         text check (product_id in ('pro_monthly','pro_annual','trip_pass')),
  store              text check (store in ('app_store','play_store')),
  status             text not null check (status in ('trial','active','in_grace','on_hold','cancelled','expired')),
  current_period_end timestamptz,
  will_renew         boolean not null default false,
  started_at         timestamptz,
  updated_at         timestamptz not null default now(),
  unique (owner_id)
);

-- entitlements already exists from 0001 (Phase 0). Align it with rahi-docs/04:
-- add expires_at + broaden source. Keep valid_until/last_validated_at for the
-- offline-grace fields used by the Phase 0 resolver (backward compatible).
alter table public.entitlements add column if not exists expires_at timestamptz;
alter table public.entitlements drop constraint if exists entitlements_source_check;
alter table public.entitlements
  add constraint entitlements_source_check
  check (source in ('subscription','trial','trip_pass','promo','apple','google','stub'));

create table if not exists public.receipts (
  id          uuid primary key default public.uuid_generate_v7(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  store       text check (store in ('app_store','play_store')),
  rc_event_id text,
  event_type  text,
  raw         jsonb,
  received_at timestamptz not null default now()
);
create index if not exists receipts_owner_idx on public.receipts (owner_id);

-- =============================================================================
-- 7. updated_at triggers (LWW tiebreak relies on accurate updated_at)
-- =============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','bikes','emergency_contacts','trips','groups','group_members',
    'routes','tile_packs','pois','poi_corridor_sync','expenses','expense_shares',
    'kitty','kitty_contributions','settlements','fuel_logs','sos_events',
    'hazard_reports','documents','subscriptions'
  ] loop
    execute format('drop trigger if exists %I_touch_updated_at on public.%I;', t, t);
    execute format(
      'create trigger %I_touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();', t, t);
  end loop;
end $$;
