/**
 * MapLibre style definitions (rahi-docs/07 §1). Two modes:
 *
 *  - ONLINE (dev / when connected): an OSM raster source as a simple base. OSM's
 *    public tile servers are rate-limited and not for heavy production use — this
 *    is a development fallback only. Production rendering uses our own vector
 *    PMTiles packs on R2 (offline). Either way OSM attribution is REQUIRED (ODbL,
 *    rahi-docs/07 §6).
 *
 *  - OFFLINE: a vector source backed by a downloaded PMTiles file on disk, read
 *    via the `pmtiles://` protocol. This is the offline-first path — full map with
 *    the radio off (rahi-docs/07 §1). The local file path comes from the
 *    offline-pack manager (offlinePacks.ts, Task 2.2).
 */
import type { StyleSpecification } from '@maplibre/maplibre-react-native';

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/** Online raster fallback (dev). Replace with vector PMTiles in production. */
export function onlineRasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      'osm-raster': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: OSM_ATTRIBUTION,
        maxzoom: 19,
      },
    },
    layers: [{ id: 'osm-raster', type: 'raster', source: 'osm-raster' }],
  };
}

/**
 * Offline vector style backed by a local PMTiles pack. `pmtilesPath` is an
 * absolute file URI (file://…/pack.pmtiles) registered with the pmtiles protocol.
 * Layer styling is intentionally minimal here; the full cartographic style is
 * applied from the packaged style JSON in production.
 */
export function offlinePmtilesStyle(pmtilesPath: string): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sources: {
      rahi: {
        type: 'vector',
        url: `pmtiles://${pmtilesPath}`,
        attribution: OSM_ATTRIBUTION,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#F3F0E9' } },
      {
        id: 'roads',
        type: 'line',
        source: 'rahi',
        'source-layer': 'transportation',
        paint: { 'line-color': '#8B8474', 'line-width': 1.2 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'rahi',
        'source-layer': 'water',
        paint: { 'fill-color': '#E3EBF2' },
      },
    ],
  };
}
