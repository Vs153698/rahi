-- 0004_phase3_poi_corridor.sql
-- Phase 3 Task 3.2 — enrich poi_corridor_sync so the device gets corridor POIs
-- from a SINGLE synced table (PowerSync data queries can't join — rahi-docs/05 §2).
-- We denormalize the display fields the app needs onto the trip-scoped join, so
-- sync rules push exactly the corridor subset by trip_id (rahi-docs/04 §7, /07 §2).

alter table public.poi_corridor_sync add column if not exists category text;
alter table public.poi_corridor_sync add column if not exists name text;
alter table public.poi_corridor_sync add column if not exists geom geography(Point, 4326);
alter table public.poi_corridor_sync add column if not exists tags jsonb;

create index if not exists poi_corridor_geom_gist on public.poi_corridor_sync using gist (geom);
create index if not exists poi_corridor_category_idx on public.poi_corridor_sync (category);

-- RLS read policy (trip access) was created in 0003; writes remain service-role
-- only (server-authoritative ingestion). No client write policy.
