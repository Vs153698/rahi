# Phase 0 — Exit-gate checklist

Tracks the Phase 0 tasks (`../rahi-docs/_build-tasks/phase-0.md`) and exit gates
(`../rahi-docs/02-build-plan.md`). ✅ = built in this scaffold. ⏳ = requires a
provisioned account / a real device to fully verify (left as env placeholders).

## Tasks

- [x] **0.1 Monorepo scaffold** — pnpm + Turborepo; `apps/{mobile,api}`, `packages/{shared,config,sync-rules}`, `tools/eslint-plugin-rahi`; root `package.json` engines, `pnpm-workspace.yaml`, `turbo.json` (build/lint/typecheck/test/ingest).
- [x] **0.2 Shared config + base schemas** — ESLint (+ custom `no-direct-db-write-outside-repo`), Prettier, strict tsconfig, Jest presets; `@rahi/shared` Zod entities (`Note`, `Entitlement`) with inferred types used by both apps.
- [x] **0.3 CI** — `.github/workflows/ci.yml`: `pnpm install --frozen-lockfile` → build packages → typecheck → lint → format check.
- [x] **0.4 Supabase + PostGIS + config + /health** — NestJS config module (Zod-validated env, Doppler-ready), Supabase service, `/health` reporting PostGIS, migration `0000_init_postgis.sql`. ⏳ live connection needs the Mumbai project.
- [x] **0.5 Phone OTP auth** — mobile `(auth)/login` (+91, two-step), API `auth` module (Supabase JWT guard, MSG91 sender, per-phone rate limit). ⏳ real send needs MSG91 + DLT.
- [x] **0.6 PowerSync + trivial entity** — `AppSchema` (notes, entitlements), Supabase connector, owner-scoped sync rule, migration `0001`. ⏳ round-trip needs PowerSync + Supabase.
- [x] **0.7 Mobile shell + offline session** — Expo Router tabs, secure-store session, cold-start DB+session load without awaiting network, connectivity store.
- [x] **0.8 RevenueCat + stub `pro` entitlement** — `useEntitlement('pro')` over the synced table + shared grace resolver; gates the Pro screen; offline read. Stub (always-false) until Phase 5.
- [x] **0.9 Sentry** — mobile + API init with PII scrubbing; no-op without DSN.
- [x] **0.10 Exit verification** — this checklist + `apps/mobile/e2e/phase0.smoke.md` + runnable unit tests (`@rahi/shared`: grace window, schemas).

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| App launches **fully offline** | ✅ code / ⏳ device | `app/_layout.tsx` opens DB + session before network |
| OTP login once online | ⏳ provisioning | `app/(auth)/login.tsx`, `src/auth/*` |
| Session persists across kill/reopen offline | ✅ code / ⏳ device | `src/supabase.ts` (secure-store), `src/state/session.ts` |
| Trivial entity created offline syncs on reconnect | ⏳ provisioning | `notes.repository.ts`, `db/connector.ts`, sync rules |
| `pro` entitlement reads (stubbed) end-to-end | ✅ | `useEntitlement.ts`, `entitlement.ts` resolver, `app/(tabs)/pro.tsx` |

## What's intentionally deferred

- Real Supabase / PowerSync / MSG91 / RevenueCat / Sentry credentials — env placeholders, marked `// verify` / `TODO(phase-0-provisioning)`.
- Device-only flows (offline launch, OTP send, sync round-trip) — verified via `apps/mobile/e2e/phase0.smoke.md` once accounts exist + a dev-client build is installed.
- **Spike-M (mesh)** — parallel risk track from Phase 0 (`../rahi-docs/06`), not part of this app scaffold.

## Verify locally

```bash
corepack enable && pnpm install
pnpm --filter @rahi/shared build
pnpm --filter @rahi/shared test       # grace-window + schema unit tests
pnpm turbo run typecheck              # whole workspace
```
