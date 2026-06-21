# Phase 9 — Trip Prep & Docs — exit-gate checklist

Tracks Phase 9 (`../rahi-docs/_build-tasks/phase-9.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/07`, `../rahi-docs/10`. All Pro.
✅ = built + verified (mocked). ⏳ = needs live services / a device.

## Tasks

- [x] **9.1 One-tap trip pack** — API `trippack/trippack.controller.ts` (one call → tile-pack job + POI ingest for the corridor) + mobile `features/trippack/trippack.ts` (one-tap pre-download with progress; caches Open-Meteo weather locally). Shared `buildOpenMeteoUrl`/`parseOpenMeteoDaily`/`roughDays` (tested).
- [x] **9.2 Document vault** — `features/vault/vault.ts`: biometric/PIN gate (expo-local-authentication), per-user vault key in the keychain (never leaves device), on-device **encrypt-before-upload** seam (placeholder XOR → native AES/libsodium), metadata in `documents`. Blobs stored encrypted; R2 presign is the upload path.
- [x] **9.3 Checklists + permits** — shared `PACKING_CHECKLIST` + `PERMIT_ZONES` (Spiti/Rohtang, Ladakh inner-line, North Sikkim, Arunachal) shipped offline + `checklistProgress` (tested); mobile `features/checklists/checklists.ts` with device-local tick state.
- [x] **9.4 Hazard reports + moderation** — mobile `features/hazards/hazards.repository.ts` (create/confirm/flag, geotagged, mesh-broadcast hook, **auto-hide** via shared `moderationFromFlags`, counter-merge via `mergeHazard`); API `admin/*` review queue + resolve (admin-gated). `hazard_reports` synced trip-scoped.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| One tap pre-downloads everything for the corridor; usable offline | ✅ code / ⏳ live tiles+weather | `trippack.ts`, `trippack.controller.ts` |
| Store/retrieve docs offline; blobs encrypted; biometric gate works | ✅ flow / ⏳ device (real cipher) | `vault.ts` |
| Checklist + permit content available offline | ✅ | shared `checklists.ts`, `features/checklists` |
| A report shares to the group, can be flagged, auto-hides past threshold | ✅ logic | `hazards.repository.ts`, `moderationFromFlags` (tested), admin queue |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **104 unit tests pass** (added checklist progress, Open-Meteo parse + rough-day flagging, hazard moderation incl. admin override).
- All 15 new/changed files parse clean; group bucket syncs `hazard_reports` (17 data queries); rail guard still passes.

## Deferred (needs live services / device)

- Real on-device AES/libsodium vault cipher + R2 presigned upload; biometric on a dev-client build.
- Live tile + POI ingest jobs (BullMQ) and Open-Meteo fetch for a real corridor.
- DigiLocker/Setu document import — V1.5 (rahi-docs/09/12).
