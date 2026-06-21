# Phase 10 — Content & Retention — exit-gate checklist

Tracks Phase 10 (`../rahi-docs/_build-tasks/phase-10.md`, gates in `../rahi-docs/02`). All Pro.
✅ = built + verified (mocked). ⏳ = needs live services / device sensors.

## Tasks

- [x] **10.1 Recap/poster** — API `recap/*` (persist stats to `recaps`, write `badges`, poster render stub → R2) + mobile `features/recap/recap.ts` (computes stats from the local track offline, asks the server to persist + render).
- [x] **10.2 Badges + stats** — shared `computeRideStats` (distance, max altitude, elevation gain, longest day, states crossed) + `awardBadges`/`badgeLabel`; mobile `features/badges/badges.ts` reads earned badges (server-authoritative). **Tested.**
- [x] **10.3 Altitude/AMS + storm** — shared `pressureToAltitudeM`/`ascentOverWindow`/`amsAscentWarning`/`pressureChange`/`stormWarning`; mobile `features/altitude/altitude.ts` (barometer monitor) surfaced in the Recap tab. Offline. **Tested.**
- [x] **10.4 Coverage map + coverage-aware sync** — API `coverage/*` (consent-gated sample ingest, aggregation stub) + mobile `sync/coverage.ts` (contribute samples, `deadZoneAhead` warning, `shouldEagerFlush` → reconnect on signal). Shared predictive decisions **tested**.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| A recap generates after a completed ride | ✅ code / ⏳ live render | `recap/*`, `features/recap` |
| Badges award from the track log | ✅ logic | `computeRideStats`/`awardBadges` (tested) |
| Altitude profile + warnings work offline from the barometer | ✅ logic / ⏳ device sensor | `altitude.ts`, shared barometry (tested) |
| Coverage layer accumulates; queue surfaces warnings + flushes on coverage | ✅ logic / ⏳ live aggregation | `coverage/*`, shared `deadZoneAhead`/`shouldEagerFlush` (tested) |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **111 unit tests pass** (added ride stats + badges, barometry/AMS/storm, coverage dead-zone + eager-flush).
- All 12 new/changed files parse clean; rail guard still passes.

## Deferred (needs live services / device)

- Real poster render job (RideCanvas-style → R2) and coverage aggregation → PMTiles on R2.
- On-device barometer profile, AMS symptom log UI, and live coverage contribution on a dev-client build.
