-- 0000_init_postgis.sql
-- Phase 0 Task 0.4 — enable PostGIS on the Supabase (Mumbai) Postgres.
-- PostGIS backs route corridors, POI geo queries, and coverage maps (rahi-docs/04, /07).
-- Apply via Supabase migrations / `supabase db push` with the service role.

create extension if not exists postgis;

-- Sanity: expose a function the /health endpoint can call to confirm presence.
-- (postgis_version() ships with the extension; no custom function needed.)

-- Helper used by later tables to default UUIDs.
create extension if not exists "pgcrypto";
