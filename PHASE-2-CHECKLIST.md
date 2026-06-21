# Phase 2 — Maps & Offline Tiles — exit-gate checklist

Tracks Phase 2 (`../rahi-docs/_build-tasks/phase-2.md`, gates in `../rahi-docs/02`).
Built against the UI mockup's design tokens (`apps/mobile/src/theme/tokens.ts`).
✅ = built + verified (mocked). ⏳ = needs a device / live tiles+routing to fully confirm.

## Tasks

- [x] **2.1 MapLibre integration** — `apps/mobile/src/maps/MapView.tsx` (interactive map, route + recorded-track polylines) + `style.ts` (online OSM raster fallback / offline PMTiles vector style). **Required OSM attribution** always shown (ODbL).
- [x] **2.2 PMTiles offline packs** — API `maps/tiles.job.ts` (creates `tile_packs` row → extract+R2 upload behind a `TileExtractor` seam → mark ready) + `tile-packs.repository.ts`; mobile `offlinePacks.ts` (download-on-wifi with progress, list/delete, large-download warning) + pure `storage.ts`. **Download gated behind `pro`** (`ProRequiredError`, stub until Phase 5).
- [x] **2.3 Route input + compute** — API `routing/*` (GraphHopper client → shared `parseGraphHopperPath` → corridor buffer via turf → persist to `routes`); mobile `routing.ts` (online compute, offline cached read from local `routes`, spoken turns via expo-speech). Shared `ComputedRoute`/`RouteInstruction` contract + parser.
- [x] **2.4 Offline track recording** — `location/trackRecorder.ts` (expo-location background + Android foreground service, jitter filter, batch flush) + `tracks.repository.ts` (append-only batched writes via the durable queue); shared `downsampleByDistance`/`haversine` for sync downsampling. `app.json` background-location + foreground-service config.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| View map, pan/zoom; attribution visible | ✅ code / ⏳ device | `MapView.tsx`, `style.ts` |
| Download a pack on wifi → render area with radio off | ✅ flow / ⏳ live tiles | `offlinePacks.ts`, `tiles.job.ts` |
| Storage screen lists/deletes packs | ✅ | `offlinePacks.ts`, `storage.ts` |
| Enter a route → polyline renders; instructions cached | ✅ code / ⏳ live GraphHopper | `routing/*`, `routing.ts` |
| Record a track offline; survives backgrounding; replays | ✅ code / ⏳ device | `trackRecorder.ts`, `map.tsx` |
| Offline-pack download gated `pro` (stub) | ✅ | `ProRequiredError` |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **51 unit tests pass** (added route-parser + geo/track: haversine, path length, downsample).
- 20 new Phase 2 files parse clean; `app.json` valid with location plugin + iOS background mode.

## Deferred (needs provisioning / device)

- Live GraphHopper (India OSM extract) for real route compute; the PMTiles extract + R2 upload pipeline (`TileExtractor` is stubbed).
- On-device map render, background recording, and offline-pack download — validated on a dev-client build.
