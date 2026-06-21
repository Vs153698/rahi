# Rahi (codename)

> **`Rahi` is a placeholder codename** (Hindi: *traveller*). Pick the real brand before launch and run `../rahi-docs/BRAND-RENAME-CHECKLIST.md`.

Offline-first, freemium-subscription companion app for motorcycle riders in India. **The cloud is optional, not required** — the free tier works online; the offline suite is the paid product (Rahi Pro). Built as a pnpm + Turborepo monorepo: an Expo React Native app, a NestJS API, and shared packages, synced offline-first via PowerSync.

This repo implements the build plan in `../rahi-docs/` — Phases 0–11. See the `PHASE-*-CHECKLIST.md` files for what's done per phase.

---

## Contents
- [Architecture](#architecture)
- [Repo layout](#repo-layout)
- [Prerequisites](#prerequisites)
- [1. Install](#1-install)
- [2. Environment (Doppler)](#2-environment-doppler)
- [3. Database + sync setup](#3-database--sync-setup)
- [4. Run the API](#4-run-the-api)
- [5. Run the mobile app](#5-run-the-mobile-app)
- [Common commands](#common-commands)
- [Testing & CI](#testing--ci)
- [Switching OTP provider (MSG91 ↔ Twilio)](#switching-otp-provider-msg91--twilio)
- [Conventions](#conventions)

---

## Architecture

```
Expo RN app ──(PowerSync)── Supabase Postgres + PostGIS (Mumbai)
   │ local SQLite = source of truth        ▲
   │ MapLibre + offline PMTiles             │ webhooks / jobs
   └──(REST, offline-aware)──► NestJS API ──┘
                                  │  GraphHopper (routing), Overpass (POI),
                                  │  Razorpay (trip money), RevenueCat (subs),
                                  │  R2 (tiles/media), Redis/BullMQ (jobs)
Off-grid: rider phones form a device mesh (Phase 8) carrying positions/chat/bill
deltas; reconciled to cloud when any phone reaches signal.
```

Full design: `../rahi-docs/00-overview.md` onward.

## Repo layout

```
rahi/
├── apps/
│   ├── mobile/   # Expo React Native (iOS + Android, prebuild/dev-client)
│   └── api/      # NestJS backend (Supabase + PostGIS)
├── packages/
│   ├── shared/      # Zod schemas, types, merge/CRDT, safety/ride math (all tested)
│   ├── config/      # eslint / prettier / tsconfig / jest presets
│   └── sync-rules/  # PowerSync sync-rule definitions
├── tools/eslint-plugin-rahi/   # custom lint rule (repository pattern)
├── infra/          # service map, store setup, submission runbook
├── scripts/        # check-rails.sh (rail-separation CI guard)
└── (root configs: turbo.json, pnpm-workspace.yaml, .env.example, ...)
```

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node | **24** (`.nvmrc`; engines `>=20`) | `nvm install 24 && nvm use` |
| pnpm | **9.x** | `corepack enable && corepack prepare pnpm@9.12.0 --activate` |
| Doppler CLI | latest | secrets injection — `brew install dopplerhq/cli/doppler` |
| Expo / EAS CLI | latest | `npm i -g eas-cli` (mobile builds) |
| Xcode / Android Studio | current | for device/simulator builds |
| Docker (optional) | — | only if self-hosting Postgres/GraphHopper locally |

You also need accounts for the external services — **see [`ENV-SETUP.md`](./ENV-SETUP.md) for a step-by-step guide to obtaining every value**.

## 1. Install

```bash
corepack enable
nvm use            # picks Node 24 from .nvmrc
pnpm install       # installs the whole workspace
pnpm turbo run build --filter='./packages/*'   # build shared packages first
pnpm turbo run typecheck                        # sanity check the whole repo
```

## 2. Environment (Doppler)

Secrets live in **Doppler**, never in the repo. There are three projects:
`rahi-api`, `rahi-mobile`, `rahi-powersync`. Variable names are listed in
[`.env.example`](./.env.example); how to obtain each value is in
[`ENV-SETUP.md`](./ENV-SETUP.md).

```bash
# one-time, per project (run inside the repo)
doppler login
doppler setup            # choose project rahi-api, config dev   (for the API)
# import the rahi-api block from .env.example into Doppler, then fill values
```

> No Doppler yet? You can run the API with a local `.env` for non-secret toggles
> — but real features (Supabase, OTP, etc.) need provisioned services.

## 3. Database + sync setup

1. Create the Supabase project in **ap-south-1 (Mumbai)** (see `ENV-SETUP.md`).
2. Apply migrations in order (`apps/api/migrations/0000…0006`) via the Supabase
   SQL editor or `supabase db push`:
   - `0000` PostGIS + pgcrypto
   - `0001` Phase-0 tables
   - `0002` full schema · `0003` RLS
   - `0004` POI corridor · `0005` convoy · `0006` group chat
3. Upload the sync rules in `packages/sync-rules/sync-rules.yaml` to your
   PowerSync instance (dashboard → Sync Rules), connected to the Supabase Postgres.

## 4. Run the API

```bash
# with Doppler (recommended) — injects rahi-api secrets
doppler run -- pnpm --filter @rahi/api start:dev

# health check
curl http://localhost:3000/health
# → {"status":"ok","service":"rahi-api","checks":{...}}
```

## 5. Run the mobile app

The app uses native modules (PowerSync, MapLibre, sensors), so it needs a
**dev-client** build — not Expo Go.

```bash
cd apps/mobile

# generate native projects
pnpm prebuild            # = expo prebuild

# build + install the dev client on a device/simulator (first run is slow)
npx eas build --profile development --platform ios      # or android
# (or local: npx expo run:ios / run:android)

# start the dev server
pnpm start               # = expo start --dev-client
```

Public config (Supabase anon URL/key, PowerSync URL, RevenueCat public key, Sentry
DSN, API base URL) comes from `apps/mobile/app.json` `extra` and `EXPO_PUBLIC_*`
env (mirror `rahi-mobile` Doppler → EAS secrets). The app launches **fully
offline**; OTP login needs connectivity once.

## Common commands

| Command | What it does |
|---|---|
| `pnpm turbo run typecheck` | typecheck every package |
| `pnpm turbo run lint` | lint (incl. repository-pattern rule) |
| `pnpm turbo run test` | unit tests (shared: merge/CRDT, safety, ride, mesh…) |
| `pnpm --filter @rahi/shared test` | just the shared package tests |
| `pnpm --filter @rahi/api start:dev` | run the API in watch mode |
| `pnpm --filter @rahi/mobile start` | start the Expo dev server |
| `pnpm format` / `pnpm format:check` | Prettier |
| `bash scripts/check-rails.sh` | rail-separation guard (subscription vs trip money) |

## Testing & CI

- Unit tests run in CI on every PR/push: **typecheck → lint → test → rail guard → format check** (`.github/workflows/ci.yml`, Node 24, pnpm from `packageManager`).
- The **sync convergence** tests (`packages/shared/src/merge/convergence.spec.ts`) and the **rail-separation guard** are release blockers.
- Device-level e2e (offline launch, two-device sync, mesh) are documented under `apps/mobile/test/sync` and run on a dev build.

## Switching OTP provider (MSG91 ↔ Twilio)

Set **`OTP_PROVIDER`** in Doppler (`rahi-api`):

```bash
OTP_PROVIDER=msg91     # India / DLT templates (default)
# or
OTP_PROVIDER=twilio    # Twilio Verify API (no DLT needed — good while DLT pends)
```

Fill the matching block (`MSG91_*` or `TWILIO_*`) and restart the API. No code
change — `OtpService` picks the provider at runtime. Get the values from
`ENV-SETUP.md`.

## Conventions

- TypeScript **strict**; no `any` without an inline `// reason:`.
- **No direct DB writes outside repositories** (lint rule `no-direct-db-write-outside-repo`).
- Every synced table documents its **conflict strategy** (`../rahi-docs/05`); gated features check the **`pro` entitlement**.
- Two billing rails kept **strictly separate**: subscription = stores only; trip money = Razorpay/UPI only (`scripts/check-rails.sh`).
- No PII logged; permission strings honest; safety features are **best-effort** (never "guaranteed").

---

*New here? Read `ENV-SETUP.md` to get credentials, then follow steps 1–5 above.*
