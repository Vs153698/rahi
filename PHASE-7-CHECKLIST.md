# Phase 7 — Ride Groups & Convoy — exit-gate checklist

Tracks Phase 7 (`../rahi-docs/_build-tasks/phase-7.md`, gates in `../rahi-docs/02`).
✅ = built + verified (mocked). ⏳ = needs live API / a device. Online-first; mesh transport is Phase 8.

## Tasks

- [x] **7.1 Groups** — API `groups/*` (create with a unique invite code, creator added as `lead`; join by code → `group_members` as `member`, idempotent). Shared `generateInviteCode`/`normalizeInviteCode`/`isValidInviteCode`/`inviteLink` (unambiguous alphabet). Mobile `features/group/group.repository.ts` (create/join via API). Membership drives sync scope.
- [x] **7.2 Convoy map + roles** — migration `0005` (`convoy_positions` one-per-member LWW + `regroup_points`, group-scoped RLS) + sync rules + local schema; mobile `features/convoy/convoy.repository.ts` (broadcast position, watch members+roles, drop regroup point) + a **Convoy** tab rendering member markers coloured by lead/sweep/member. **Gated `pro`.**
- [x] **7.3 Lost-member alert** — shared pure `detectLostMembers` (stale beyond timeout, clears on return) + mobile `features/convoy/lostMember.ts`; banner in the Convoy tab.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Create a group, join via code; membership drives data scope | ✅ code / ⏳ live API | `groups/*`, sync rules (group bucket) |
| Convoy markers + roles + regroup render; gating enforced | ✅ code / ⏳ device | `convoy.tsx`, `convoy.repository.ts`, `pro` gate |
| Lost-member alert triggers on timeout; clears on return | ✅ logic | `detectLostMembers` (tested), `lostMember.ts` |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **87 unit tests pass** (added invite-code format/normalisation + lost-member detection).
- Migration `0005` well-formed (2 tables, 2 RLS policies); all 11 new/changed files parse clean; sync-rules group bucket extended (15 data queries).

## Deferred (needs live API / device / later phases)

- Live group create/join round-trip (API + Supabase) and on-device convoy map on a dev-client build.
- **Phase 8 mesh** writes the same `convoy_positions`/`regroup_points` tables off-grid — gated on the Spike-M risk track passing first.
