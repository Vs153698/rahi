/**
 * Pure geo helpers for track recording (rahi-docs/05 §3 telemetry, /07).
 * Dependency-free so they're unit-testable and run identically on device and
 * server (the server downsamples on sync for the recap render).
 */
export interface GeoPoint {
  lng: number;
  lat: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two lng/lat points, in meters. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Total path length in meters. */
export function pathLengthMeters(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1]!, points[i]!);
  }
  return total;
}

/**
 * Downsample a breadcrumb track: keep the first point, then only points at least
 * `minMeters` from the last kept point, always keeping the last point. Removes
 * GPS jitter and shrinks the synced payload without losing route shape.
 */
export function downsampleByDistance<T extends GeoPoint>(points: T[], minMeters: number): T[] {
  if (points.length <= 2) return [...points];
  const kept: T[] = [points[0]!];
  for (let i = 1; i < points.length - 1; i++) {
    if (haversineMeters(kept[kept.length - 1]!, points[i]!) >= minMeters) {
      kept.push(points[i]!);
    }
  }
  kept.push(points[points.length - 1]!);
  return kept;
}
