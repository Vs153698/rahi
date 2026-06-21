# infra/

Infrastructure & service wiring notes. No secrets here — secrets live in Doppler
(`rahi-api`, `rahi-mobile`, `rahi-powersync`). This documents *what connects to
what*; provisioning steps are in `../../rahi-docs/12-handoff.md` §2.

## Services (Phase 0)

| Service | Purpose | Region | Secret location |
|---|---|---|---|
| Supabase | Postgres + Auth (phone OTP) + Storage; PostGIS | ap-south-1 (Mumbai) | Doppler `rahi-api` |
| PowerSync | SQLite ⇄ Postgres sync | Cloud (Asia) | Doppler `rahi-powersync` |
| MSG91 | SMS / OTP sender (DLT templates) | India | Doppler `rahi-api` |
| Cloudflare R2 | tiles / media / docs buckets | global edge | Doppler `rahi-api` |
| Upstash Redis | BullMQ (Phase 1+) | Asia | Doppler `rahi-api` |
| RevenueCat | subscription entitlements (Phase 5) | — | Doppler (mobile public key in EAS) |
| Sentry | error monitoring (mobile + api) | — | Doppler |

## Migrations

SQL migrations live in `../apps/api/migrations` and are applied to Supabase
(service role) in order:

- `0000_init_postgis.sql` — PostGIS + pgcrypto extensions.
- `0001_phase0_trivial_tables.sql` — `notes` + `entitlements` with RLS.

## PowerSync

Sync rules are in `../packages/sync-rules/sync-rules.yaml` (uploaded to the
PowerSync dashboard / via API). They scope every bucket to the authenticated
`user_id`. `entitlements` is pull-only; the client cannot write it (RLS + no
write policy).

## Doppler project map (to create)

```
rahi-api        dev | staging | prod
rahi-mobile     dev | staging | prod   (mirrored to EAS secrets)
rahi-powersync  dev | staging | prod
```

> TODO(phase-0-provisioning): create the accounts in `../../rahi-docs/12 §2`,
> then fill the Doppler projects and the `extra`/env placeholders.
