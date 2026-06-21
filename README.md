# Rahi (codename)

> **`Rahi` is a placeholder codename** (Hindi: *traveller / wayfarer*). Pick the real brand before launch and run `../rahi-docs/BRAND-RENAME-CHECKLIST.md`.

Offline-first, freemium-subscription mobile app for motorcycle riders and travellers in India. **The cloud is optional, not required.** Free tier works online; the offline suite is the paid product (Rahi Pro).

This repository is the **monorepo** scaffolded in **Phase 0** of the build plan (`../rahi-docs/_build-tasks/phase-0.md`). It is the implementation layer for the planning package in `../rahi-docs/`.

## Layout

```
rahi/
├── apps/
│   ├── mobile/            # Expo React Native app (iOS + Android, prebuild/dev-client)
│   └── api/               # NestJS backend (Supabase + PostGIS, Mumbai)
├── packages/
│   ├── shared/            # Zod schemas, shared types, constants, i18n keys
│   ├── config/            # eslint, tsconfig, prettier, jest presets
│   └── sync-rules/        # PowerSync sync-rule definitions
├── infra/                 # IaC notes, PowerSync config, Doppler map, R2 buckets
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- **Node 20 LTS** (`.nvmrc`)
- **pnpm 9.x** — `corepack enable && corepack prepare pnpm@9.12.0 --activate`
- **Doppler CLI** (secrets; no secrets committed) — `doppler setup` per app
- For mobile: **Expo / EAS** account; `npx expo prebuild` then a dev-client build (native modules required — not Expo Go)

## Quick start

```bash
corepack enable
pnpm install
pnpm turbo run typecheck    # whole workspace
pnpm turbo run lint

# API (Doppler injects env)
doppler run -- pnpm --filter @rahi/api start:dev   # /health → 200

# Mobile
pnpm --filter @rahi/mobile prebuild
pnpm --filter @rahi/mobile start
```

## Environment & secrets

All runtime config comes from **Doppler** (`rahi-api`, `rahi-mobile`, `rahi-powersync`). Copy `.env.example` files for the variable names; never commit real values. See `../rahi-docs/12-handoff.md` §2 for what must be provisioned.

## Phase 0 status

This scaffold implements Phase 0 Tasks 0.1–0.10. Live-service wiring (Supabase project, Doppler tokens, RevenueCat products, Sentry DSNs) is **env-placeholder** until those accounts are provisioned — search for `# verify` / `TODO(phase-0-provisioning)`. See `PHASE-0-CHECKLIST.md` for exit-gate verification.

## Conventions (enforced at review — see `../rahi-docs/12-handoff.md` §5)

- TypeScript **strict**; no `any` without an inline `// reason:`.
- **No direct DB writes outside repositories** (lint rule `no-direct-db-write-outside-repo`).
- Every synced table documents its **conflict strategy** (`../rahi-docs/05`).
- Every gated feature checks the **`pro` entitlement** (`../rahi-docs/08`/`09`).
- **No PII logged**; permission strings honest.
- Two billing rails kept **strictly separate**: subscription = stores only; trip money = Razorpay/UPI only.
