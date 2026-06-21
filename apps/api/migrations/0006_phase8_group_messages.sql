-- 0006_phase8_group_messages.sql
-- Phase 8 — group chat carried over mesh (and cloud). Append-only, immutable
-- (rahi-docs/05 §3, /06 §1): no edits, so no conflicts — a message that arrived
-- via mesh and via cloud is the same row (idempotent on its UUID). Group-scoped.

create table if not exists public.group_messages (
  id                uuid primary key default public.uuid_generate_v7(),
  group_id          uuid not null references public.groups (id) on delete cascade,
  sender_member_id  uuid not null references public.group_members (id),
  body              text not null check (char_length(body) between 1 and 1000),
  created_at        timestamptz not null default now(),
  client_updated_at timestamptz
);
create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

alter table public.group_messages enable row level security;
drop policy if exists group_messages_group on public.group_messages;
create policy group_messages_group on public.group_messages for all
  using (exists (select 1 from public.groups g
                 where g.id = group_messages.group_id and public.can_access_trip(g.trip_id, auth.uid())))
  with check (exists (select 1 from public.groups g
                 where g.id = group_messages.group_id and public.can_access_trip(g.trip_id, auth.uid())));
