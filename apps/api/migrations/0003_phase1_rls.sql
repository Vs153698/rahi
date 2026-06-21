-- 0003_phase1_rls.sql
-- Phase 1 — Row Level Security. Defense-in-depth alongside PowerSync sync rules
-- (rahi-docs/05 §2, /10). Mirrors the sync-rule scoping in rahi-docs/04 §7:
-- a user sees their own rows + their groups' shared rows, and nothing else.
-- Subscriptions/entitlements/receipts are read-only on the device.

-- Helper to (re)create a policy idempotently is inlined via drop-if-exists.

-- ---- Owner-scoped (owner_id = auth.uid()): read+write own ----
do $$
declare t text;
begin
  foreach t in array array[
    'bikes','emergency_contacts','trips','sos_events','documents','badges'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_owner_all on public.%I;', t, t);
    execute format(
      'create policy %I_owner_all on public.%I for all
       using (owner_id = auth.uid()) with check (owner_id = auth.uid());', t, t);
  end loop;
end $$;

-- profiles: a user manages only their own profile.
alter table public.profiles enable row level security;
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- fuel_logs: scoped via the owning bike.
alter table public.fuel_logs enable row level security;
drop policy if exists fuel_logs_owner on public.fuel_logs;
create policy fuel_logs_owner on public.fuel_logs for all
  using (exists (select 1 from public.bikes b where b.id = fuel_logs.bike_id and b.owner_id = auth.uid()))
  with check (exists (select 1 from public.bikes b where b.id = fuel_logs.bike_id and b.owner_id = auth.uid()));

-- ---- Trip / group-scoped (visible to trip owner or group members) ----
alter table public.groups enable row level security;
drop policy if exists groups_trip_access on public.groups;
create policy groups_trip_access on public.groups for all
  using (public.can_access_trip(trip_id, auth.uid()))
  with check (public.can_access_trip(trip_id, auth.uid()));

alter table public.group_members enable row level security;
drop policy if exists group_members_same_group on public.group_members;
create policy group_members_same_group on public.group_members for all
  using (public.is_group_member(group_id, auth.uid()) or
         exists (select 1 from public.groups g join public.trips t on t.id = g.trip_id
                 where g.id = group_members.group_id and t.owner_id = auth.uid()))
  with check (true);

-- expenses / shares / kitty / settlements: scoped via trip access.
alter table public.expenses enable row level security;
drop policy if exists expenses_trip_access on public.expenses;
create policy expenses_trip_access on public.expenses for all
  using (public.can_access_trip(trip_id, auth.uid()))
  with check (public.can_access_trip(trip_id, auth.uid()));

alter table public.expense_shares enable row level security;
drop policy if exists expense_shares_access on public.expense_shares;
create policy expense_shares_access on public.expense_shares for all
  using (exists (select 1 from public.expenses e where e.id = expense_shares.expense_id
                 and public.can_access_trip(e.trip_id, auth.uid())))
  with check (exists (select 1 from public.expenses e where e.id = expense_shares.expense_id
                 and public.can_access_trip(e.trip_id, auth.uid())));

do $$
declare t text;
begin
  foreach t in array array['kitty','settlements'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_group_access on public.%I;', t, t);
    execute format(
      'create policy %I_group_access on public.%I for all
       using (exists (select 1 from public.groups g
                      where g.id = %I.group_id and public.can_access_trip(g.trip_id, auth.uid())))
       with check (exists (select 1 from public.groups g
                      where g.id = %I.group_id and public.can_access_trip(g.trip_id, auth.uid())));',
      t, t, t, t);
  end loop;
end $$;

alter table public.kitty_contributions enable row level security;
drop policy if exists kitty_contributions_access on public.kitty_contributions;
create policy kitty_contributions_access on public.kitty_contributions for all
  using (exists (select 1 from public.kitty k join public.groups g on g.id = k.group_id
                 where k.id = kitty_contributions.kitty_id and public.can_access_trip(g.trip_id, auth.uid())))
  with check (exists (select 1 from public.kitty k join public.groups g on g.id = k.group_id
                 where k.id = kitty_contributions.kitty_id and public.can_access_trip(g.trip_id, auth.uid())));

-- routes / tile_packs / poi_corridor_sync: read-only via trip access (writes are
-- service-role only — no client write policy).
do $$
declare t text;
begin
  foreach t in array array['routes','tile_packs','poi_corridor_sync'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I_trip_read on public.%I;', t, t);
    execute format(
      'create policy %I_trip_read on public.%I for select
       using (public.can_access_trip(trip_id, auth.uid()));', t, t);
  end loop;
end $$;

-- pois: readable by any authenticated user (device subset is bounded by sync
-- rules via poi_corridor_sync). Server-ingested; no client writes.
alter table public.pois enable row level security;
drop policy if exists pois_read on public.pois;
create policy pois_read on public.pois for select using (auth.role() = 'authenticated');

-- track_points: append + read via trip access.
alter table public.track_points enable row level security;
drop policy if exists track_points_trip on public.track_points;
create policy track_points_trip on public.track_points for all
  using (public.can_access_trip(trip_id, auth.uid()))
  with check (public.can_access_trip(trip_id, auth.uid()));

-- hazard_reports: visible ones readable by all authenticated; insert by reporter;
-- the additive counters are merged server-side (rahi-docs/05 §3).
alter table public.hazard_reports enable row level security;
drop policy if exists hazard_reports_read on public.hazard_reports;
create policy hazard_reports_read on public.hazard_reports for select
  using (moderation_status = 'visible' or reported_by = auth.uid());
drop policy if exists hazard_reports_insert on public.hazard_reports;
create policy hazard_reports_insert on public.hazard_reports for insert
  with check (reported_by = auth.uid());
drop policy if exists hazard_reports_update_own on public.hazard_reports;
create policy hazard_reports_update_own on public.hazard_reports for update
  using (reported_by = auth.uid());

-- coverage_samples: insert only (aggregated server-side; raw not synced back).
alter table public.coverage_samples enable row level security;
drop policy if exists coverage_samples_insert on public.coverage_samples;
create policy coverage_samples_insert on public.coverage_samples for insert
  with check (contributed_by = auth.uid() or contributed_by is null);

-- recaps: read via trip access.
alter table public.recaps enable row level security;
drop policy if exists recaps_trip_read on public.recaps;
create policy recaps_trip_read on public.recaps for select
  using (public.can_access_trip(trip_id, auth.uid()));

-- subscriptions / entitlements / receipts: read-only own (server writes via
-- service role, which bypasses RLS).
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_owner_read on public.subscriptions;
create policy subscriptions_owner_read on public.subscriptions for select
  using (owner_id = auth.uid());

alter table public.receipts enable row level security;
drop policy if exists receipts_owner_read on public.receipts;
create policy receipts_owner_read on public.receipts for select
  using (owner_id = auth.uid());
-- (entitlements RLS select policy created in 0001.)
