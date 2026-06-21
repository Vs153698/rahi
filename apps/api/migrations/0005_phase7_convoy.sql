-- 0005_phase7_convoy.sql
-- Phase 7 — convoy live positions + regroup points. Both group-scoped and synced
-- to members (rahi-docs/04 §7). Online-first in Phase 7; the mesh transport
-- (Phase 8) writes the SAME tables through the same merge, so no rework.

-- ---------------------------------------------------------------------------
-- convoy_positions — one live position per member per group (LWW by updated_at).
-- ---------------------------------------------------------------------------
create table if not exists public.convoy_positions (
  id         uuid primary key default public.uuid_generate_v7(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  member_id  uuid not null references public.group_members (id) on delete cascade,
  geom       geography(Point, 4326) not null,
  heading    numeric(5,2),
  speed_kmh  numeric(6,2),
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (group_id, member_id)
);
create index if not exists convoy_positions_group_idx on public.convoy_positions (group_id);
create index if not exists convoy_positions_geom_gist on public.convoy_positions using gist (geom);

alter table public.convoy_positions enable row level security;
drop policy if exists convoy_positions_group on public.convoy_positions;
create policy convoy_positions_group on public.convoy_positions for all
  using (exists (select 1 from public.groups g
                 where g.id = convoy_positions.group_id and public.can_access_trip(g.trip_id, auth.uid())))
  with check (exists (select 1 from public.groups g
                 where g.id = convoy_positions.group_id and public.can_access_trip(g.trip_id, auth.uid())));

drop trigger if exists convoy_positions_touch on public.convoy_positions;
create trigger convoy_positions_touch before update on public.convoy_positions
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- regroup_points — pins the lead drops for the group to gather at.
-- ---------------------------------------------------------------------------
create table if not exists public.regroup_points (
  id         uuid primary key default public.uuid_generate_v7(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.group_members (id),
  geom       geography(Point, 4326) not null,
  label      text,
  client_updated_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists regroup_points_group_idx on public.regroup_points (group_id);

alter table public.regroup_points enable row level security;
drop policy if exists regroup_points_group on public.regroup_points;
create policy regroup_points_group on public.regroup_points for all
  using (exists (select 1 from public.groups g
                 where g.id = regroup_points.group_id and public.can_access_trip(g.trip_id, auth.uid())))
  with check (exists (select 1 from public.groups g
                 where g.id = regroup_points.group_id and public.can_access_trip(g.trip_id, auth.uid())));

drop trigger if exists regroup_points_touch on public.regroup_points;
create trigger regroup_points_touch before update on public.regroup_points
  for each row execute function public.touch_updated_at();
