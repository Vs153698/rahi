# Phase 3 — POI Engine — exit-gate checklist

Tracks Phase 3 (`../rahi-docs/_build-tasks/phase-3.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/07 §2`.
✅ = built + verified (mocked). ⏳ = needs live Overpass / a device.

## Tasks

- [x] **3.1 Overpass ingestion** — API `poi/overpass.client.ts` (corridor polygon → Overpass QL across rider categories) + shared pure `normalizeOverpassElement`/`categorize` + `poi.repository.ts` upsert **idempotent on (osm_type, osm_id)** keeping useful tags. Orchestrated by `ingest.job.ts` (BullMQ-ready).
- [x] **3.2 Corridor sync subset** — migration `0004` enriches `poi_corridor_sync` with denormalized POI display fields (category/name/geom/tags) so the device syncs the corridor subset from one trip-scoped table (PowerSync can't join); `poi-corridor.repository.ts` replaces a trip's set idempotently; `ingest.job.ts` computes per-POI distance-to-route via turf. Sync rule already pushes `poi_corridor_sync` by `trip_id`.
- [x] **3.3 Offline browse + nearest-X** — mobile `features/poi/poi.repository.ts` (browse, category filter, "nearest fuel/mechanic/hospital" via shared `nearestByCategory`/haversine, all from local SQLite) + a **Places** tab with filter chips. Offline subset **gated `pro`** (`PoiOfflineUnavailableError` + locked screen).

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Running ingestion for a corridor populates `pois`; re-run idempotent | ✅ code / ⏳ live Overpass | `ingest.job.ts`, `poi.repository.ts` (onConflict) |
| Device pulls only corridor POIs for its active trips; set stays small | ✅ rules + schema / ⏳ live | `poi_corridor_sync` (trip-scoped), `0004` |
| Browse + "nearest X" work with no signal | ✅ code / ⏳ device | `features/poi/*`, shared `nearestByCategory` |
| Offline subset gated `pro` | ✅ | `PoiOfflineUnavailableError`, locked screen |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **56 unit tests pass** (added POI: categorize, normalize, nearest).
- 10 new/changed Phase 3 files parse clean; migration `0004` well-formed (4 column adds + GIST).

## Deferred (needs provisioning / device)

- Live Overpass query volume (self-host if throttled — rahi-docs/07 §2) and the BullMQ enqueue wiring on Upstash Redis.
- On-device corridor sync + offline browse on a dev-client build.
