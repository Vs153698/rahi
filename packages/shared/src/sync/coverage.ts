import { haversineMeters, type GeoPoint } from '../geo/track';

/**
 * Coverage-aware predictive sync (Task 10.4, rahi-docs/05 §5). Pure decisions over
 * a coverage layer (built from crowd `coverage_samples`): warn before a long dead
 * stretch ("send now") and eagerly flush the upload queue the instant a known
 * signal pocket is reached. This is what turns "online vs offline" into "mostly
 * offline with rare pockets, used well".
 */
export interface RouteCell extends GeoPoint {
  /** Whether the coverage layer says this stretch likely has signal. */
  hasSignal: boolean;
  /** Distance along the route from the rider's position (km). */
  alongKm: number;
}

export interface DeadZoneAhead {
  warn: boolean;
  /** Length of the upcoming continuous no-signal stretch (km). */
  deadStretchKm: number;
  /** Distance until that stretch begins (km). */
  startsInKm: number;
}

/**
 * Look ahead along the route for the next continuous no-signal stretch; warn if
 * it exceeds `thresholdKm` so the rider can flush anything pending now.
 */
export function deadZoneAhead(cells: RouteCell[], thresholdKm = 15): DeadZoneAhead {
  const ahead = [...cells].sort((a, b) => a.alongKm - b.alongKm);
  let i = 0;
  // skip leading signal cells
  while (i < ahead.length && ahead[i]!.hasSignal) i++;
  if (i >= ahead.length) return { warn: false, deadStretchKm: 0, startsInKm: 0 };

  const startsInKm = ahead[i]!.alongKm;
  let endIdx = i;
  while (endIdx < ahead.length && !ahead[endIdx]!.hasSignal) endIdx++;
  const endKm = endIdx < ahead.length ? ahead[endIdx]!.alongKm : ahead[ahead.length - 1]!.alongKm;
  const deadStretchKm = Math.round((endKm - startsInKm) * 10) / 10;

  return { warn: deadStretchKm >= thresholdKm, deadStretchKm, startsInKm: Math.round(startsInKm * 10) / 10 };
}

/** Whether to eagerly flush the queue: entered a signal pocket with work pending. */
export function shouldEagerFlush(params: {
  enteredSignal: boolean;
  pendingMutations: number;
}): boolean {
  return params.enteredSignal && params.pendingMutations > 0;
}

/** Nearest known signal pocket to a point, by straight-line distance (meters). */
export function nearestSignalMeters(from: GeoPoint, cells: RouteCell[]): number | null {
  const withSignal = cells.filter((c) => c.hasSignal);
  if (withSignal.length === 0) return null;
  return Math.round(
    withSignal.reduce((min, c) => Math.min(min, haversineMeters(from, c)), Infinity),
  );
}
