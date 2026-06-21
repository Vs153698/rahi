-- 0001_phase0_trivial_tables.sql
-- Phase 0 Tasks 0.6 + 0.8 — the trivial synced entity (`notes`) and the
-- server-authoritative `entitlements` projection. PowerSync syncs both per the
-- sync rules in packages/sync-rules/sync-rules.yaml.
--
-- Conflict strategy (rahi-docs/05):
--   notes        — last-write-wins on scalars, keyed by updated_at. Owner read+write.
--   entitlements — server-authoritative, PULL ONLY. Client writes are blocked by RLS.

-- ---------------------------------------------------------------------------
-- notes — proves the offline create -> reconnect -> appears-in-Postgres flow.
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_owner_id_idx on public.notes (owner_id);

alter table public.notes enable row level security;

-- Owner can do everything with their own rows; nothing else is visible.
drop policy if exists notes_owner_all on public.notes;
create policy notes_owner_all on public.notes
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- entitlements — synced projection of subscription state. Written only by the
-- service role (webhooks/receipt validation in Phase 5). Client is read-only.
-- ---------------------------------------------------------------------------
create table if not exists public.entitlements (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references auth.users (id) on delete cascade,
  entitlement       text not null default 'pro' check (entitlement = 'pro'),
  is_active         boolean not null default false,
  valid_until       timestamptz,
  last_validated_at timestamptz not null default now(),
  source            text not null default 'stub' check (source in ('apple', 'google', 'stub')),
  updated_at        timestamptz not null default now(),
  unique (owner_id, entitlement)
);

create index if not exists entitlements_owner_id_idx on public.entitlements (owner_id);

alter table public.entitlements enable row level security;

-- Owner may READ their entitlement; no client write policy exists, so inserts/
-- updates/deletes from the client are rejected. Service role bypasses RLS.
drop policy if exists entitlements_owner_select on public.entitlements;
create policy entitlements_owner_select on public.entitlements
  for select
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- keep updated_at honest on writes (LWW conflict resolution relies on it).
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists entitlements_touch_updated_at on public.entitlements;
create trigger entitlements_touch_updated_at
  before update on public.entitlements
  for each row execute function public.touch_updated_at();
