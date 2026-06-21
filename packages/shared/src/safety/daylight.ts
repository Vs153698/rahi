/**
 * Offline daylight math (Task 6.2). Computes sunset for the rider's coordinates
 * with no network — a port of the well-tested SunCalc sunset algorithm — then
 * warns if they won't reach a target before dark at their current pace. Pure.
 */
const rad = Math.PI / 180;
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth
const J0 = 0.0009;
const SUNSET_ALTITUDE = rad * -0.833; // standard refraction-adjusted horizon

const toJulian = (d: Date): number => d.valueOf() / dayMs - 0.5 + J1970;
const fromJulian = (j: number): Date => new Date((j + 0.5 - J1970) * dayMs);
const toDays = (d: Date): number => toJulian(d) - J2000;

const solarMeanAnomaly = (d: number): number => rad * (357.5291 + 0.98560028 * d);
const eclipticLongitude = (M: number): number =>
  M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
const declination = (l: number): number => Math.asin(Math.sin(e) * Math.sin(l));

const julianCycle = (d: number, lw: number): number => Math.round(d - J0 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number): number => J0 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number): number =>
  J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
const hourAngle = (h: number, phi: number, dec: number): number =>
  Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));

/** Sunset (UTC) for a date + coordinates. Returns null in polar day/night. */
export function sunsetUtc(date: Date, lat: number, lng: number): Date | null {
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);

  const cosH =
    (Math.sin(SUNSET_ALTITUDE) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
  if (cosH > 1 || cosH < -1) return null; // sun never crosses the horizon

  const w = hourAngle(SUNSET_ALTITUDE, phi, dec);
  const a = approxTransit(w, lw, n);
  const Jset = solarTransitJ(a, M, L);
  return fromJulian(Jset);
}

/** Minutes from `now` until sunset (negative if already past). */
export function minutesUntilSunset(now: Date, lat: number, lng: number): number | null {
  const set = sunsetUtc(now, lat, lng);
  if (!set) return null;
  return Math.round((set.valueOf() - now.valueOf()) / 60000);
}

export interface DaylightWarning {
  warn: boolean;
  etaMinutes: number;
  minutesUntilSunset: number | null;
}

/**
 * Warn when the ETA to the remaining distance exceeds the daylight left (minus a
 * safety buffer, default 20 min). paceKmh defaults to a cautious 40 km/h.
 */
export function daylightWarning(params: {
  now: Date;
  lat: number;
  lng: number;
  remainingKm: number;
  paceKmh?: number;
  bufferMinutes?: number;
}): DaylightWarning {
  const pace = params.paceKmh && params.paceKmh > 0 ? params.paceKmh : 40;
  const buffer = params.bufferMinutes ?? 20;
  const etaMinutes = Math.round((params.remainingKm / pace) * 60);
  const left = minutesUntilSunset(params.now, params.lat, params.lng);
  const warn = left == null ? false : etaMinutes + buffer > left;
  return { warn, etaMinutes, minutesUntilSunset: left };
}
