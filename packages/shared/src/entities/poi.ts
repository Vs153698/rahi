import { z } from 'zod';

import { haversineMeters, type GeoPoint } from '../geo/track';

/**
 * POI contract shared by the ingestion pipeline (API) and offline browse (app).
 * Categories are rider-prioritised (rahi-docs/07 §2): fuel/mechanic/puncture/
 * hospital rank above restaurants. Normalisation from raw OSM/Overpass elements
 * is pure so the server and any client shape POIs identically.
 */
export const POI_CATEGORIES = [
  'fuel',
  'mechanic',
  'puncture',
  'hospital',
  'atm',
  'police',
  'food',
  'dhaba',
  'homestay',
  'water',
  'viewpoint',
  'other',
] as const;
export type PoiCategory = (typeof POI_CATEGORIES)[number];

export const PoiSchema = z.object({
  osm_id: z.number().int(),
  osm_type: z.enum(['node', 'way', 'relation']),
  category: z.enum(POI_CATEGORIES),
  name: z.string().nullable(),
  lng: z.number(),
  lat: z.number(),
  tags: z.record(z.string()).default({}),
});
export type Poi = z.infer<typeof PoiSchema>;

/** Raw Overpass element (node with lat/lon, or way/relation with a center). */
export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Map OSM tags to one of our rider categories (first match wins). */
export function categorize(tags: Record<string, string>): PoiCategory {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const tourism = tags.tourism;
  const name = (tags.name ?? '').toLowerCase();

  if (amenity === 'fuel') return 'fuel';
  if (shop === 'motorcycle_repair' || shop === 'car_repair' || shop === 'motorcycle') return 'mechanic';
  if (shop === 'tyres' || name.includes('puncture')) return 'puncture';
  if (amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors') return 'hospital';
  if (amenity === 'atm' || amenity === 'bank') return 'atm';
  if (amenity === 'police') return 'police';
  if (name.includes('dhaba')) return 'dhaba';
  if (amenity === 'restaurant' || amenity === 'fast_food' || amenity === 'cafe') return 'food';
  if (tourism === 'guest_house' || tourism === 'hostel' || name.includes('homestay')) return 'homestay';
  if (amenity === 'drinking_water') return 'water';
  if (tourism === 'viewpoint') return 'viewpoint';
  return 'other';
}

/** Keep only the tags worth carrying offline (phone, brand, hours, fuel type). */
const KEEP_TAGS = ['phone', 'contact:phone', 'brand', 'opening_hours', 'fuel:diesel', 'fuel:petrol', 'cuisine'];

/** Normalise an Overpass element to a Poi, or null if it has no usable location. */
export function normalizeOverpassElement(el: OverpassElement): Poi | null {
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (lat == null || lon == null) return null;

  const tags = el.tags ?? {};
  const kept: Record<string, string> = {};
  for (const k of KEEP_TAGS) {
    if (tags[k] != null) kept[k] = tags[k] as string;
  }

  return {
    osm_id: el.id,
    osm_type: el.type,
    category: categorize(tags),
    name: tags.name ?? null,
    lng: lon,
    lat,
    tags: kept,
  };
}

export interface NearbyPoi extends GeoPoint {
  category: PoiCategory;
}

/** Nearest POIs of a category to a point, sorted by distance (offline "nearest X"). */
export function nearestByCategory<T extends NearbyPoi>(
  from: GeoPoint,
  pois: T[],
  category: PoiCategory,
  limit = 5,
): (T & { distanceM: number })[] {
  return pois
    .filter((p) => p.category === category)
    .map((p) => ({ ...p, distanceM: haversineMeters(from, p) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}
