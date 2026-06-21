# Phase 1 — Data Layer & Sync — exit-gate checklist

Tracks Phase 1 (`../rahi-docs/_build-tasks/phase-1.md`, gates in `../rahi-docs/02`).
✅ = built + verified here (mocked). ⏳ = needs live Supabase/PowerSync or a device.

## Tasks

- [x] **1.1 Full Postgres/PostGIS schema** — `apps/api/migrations/0002_phase1_schema.sql` (all ~26 entities from doc 04 + partitions = 31 tables), UUID v7, soft-delete, paise money, `geography(4326)` + GIST, month-partitioned `track_points`/`coverage_samples`, FK + `updated_at` indexes; `0003_phase1_rls.sql` (19 RLS policies). ⏳ apply to Supabase to confirm clean.
- [x] **1.2 PowerSync sync rules + local schema** — `packages/sync-rules/sync-rules.yaml` (user + group buckets; subscriptions/entitlements pull-only; trip/corridor scoping) and `apps/mobile/src/db/schema.ts` as a strict subset. Denormalized `group_id` onto `expense_shares`/`kitty_contributions` for join-free bucket scoping.
- [x] **1.4 Conflict strategies** — `packages/shared/src/merge/`: expense-ledger CRDT (`expense-ledger.ts`), settlement state-machine (`settlement.ts`), counter merge (`counter.ts`), LWW (`lww.ts`), append-only (`append.ts`), deterministic share recompute (`shares.ts`). Identical app+server logic. **Unit tests cover each strategy.**
- [x] **1.3 Repository pattern + write queue** — API `BaseRepository` + `TripsRepository`/`ExpensesRepository` (user/group-scoped; server applies the same CRDT merge); mobile repositories route every synced write through PowerSync's durable ordered queue (`BaseRepository.write`). Lint `no-direct-db-write-outside-repo` **promoted to error** (connector exempted with a documented reason).
- [x] **1.5 Sync test harness** — `packages/shared/src/merge/convergence.spec.ts`: commutativity, idempotence, associativity, long-offline union, clock-skew, 50-seed fuzz. Wired into CI (`pnpm turbo run test`). Device-level Detox/Maestro scenarios documented in `apps/mobile/test/sync/README.md` (land with the Phase 6 e2e runner).

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Migrations apply cleanly; GIST + FK + updated_at indexes present | ✅ authored / ⏳ apply | `migrations/0002`, `0003` |
| A user pulls only their + their groups' rows; non-members can't | ✅ rules + RLS / ⏳ live | `sync-rules.yaml`, `0003_phase1_rls.sql` |
| No feature code writes the DB directly; lint catches violations | ✅ | rule = error; repos only |
| Writes persist offline and flush in order | ✅ design / ⏳ device | PowerSync durable queue (`db/*`) |
| Unit tests cover each conflict strategy; ledger reducer identical both sides | ✅ | `merge/*.spec.ts` (shared by app + API) |
| Sync fuzz/convergence in CI; a broken merge fails them | ✅ | `convergence.spec.ts` + CI |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **43 unit tests pass** (merge strategies + 50-seed convergence fuzz + entitlement/schema).
- 16 new Phase 1 TS files parse clean; both migrations have balanced `$$` blocks; sync-rules YAML parses (user=10, group=13 data queries).

## Deferred (needs provisioning / device)

- Applying migrations to the Mumbai Supabase project (PostGIS) and uploading sync rules to PowerSync.
- Device two-simulator convergence + airplane-mode fuzz (Detox/Maestro — Phase 6 runner).
