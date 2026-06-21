/**
 * Fuel-range safety math (Task 6.1, rahi-docs/00 §2). Pure + offline: learn a
 * bike's real mileage from its fuel logs, then warn before a dry stretch by
 * comparing range-on-current-fuel against the distance to the next cached pump.
 * All distances in km, volumes in litres.
 */
export interface FuelLogPoint {
  odometer_km: number;
  litres: number;
}

/**
 * Learn km/l using the full-tank method: between consecutive fills, distance
 * covered ÷ litres added. Distance-weighted average across logs. Falls back to a
 * baseline when there isn't enough history.
 */
export function learnKmpl(logs: FuelLogPoint[], baselineKmpl: number): number {
  const sorted = [...logs].sort((a, b) => a.odometer_km - b.odometer_km);
  let distance = 0;
  let litres = 0;
  for (let i = 1; i < sorted.length; i++) {
    const d = sorted[i]!.odometer_km - sorted[i - 1]!.odometer_km;
    const l = sorted[i]!.litres;
    if (d > 0 && l > 0) {
      distance += d;
      litres += l;
    }
  }
  if (litres <= 0 || distance <= 0) return baselineKmpl;
  return distance / litres;
}

/** Range remaining (km) for litres of fuel at a learned mileage. */
export function fuelRangeKm(litresRemaining: number, kmpl: number): number {
  return Math.max(0, litresRemaining * kmpl);
}

export interface FuelWarning {
  warn: boolean;
  rangeKm: number;
  marginKm: number; // range − distance to next pump
}

/**
 * Warn when reaching the next pump would leave less than `reserveKm` in the tank
 * (default 15 km of reserve). `distanceToNextPumpKm` comes from the nearest
 * cached fuel POI (Phase 3).
 */
export function fuelRangeWarning(params: {
  litresRemaining: number;
  kmpl: number;
  distanceToNextPumpKm: number;
  reserveKm?: number;
}): FuelWarning {
  const reserve = params.reserveKm ?? 15;
  const rangeKm = fuelRangeKm(params.litresRemaining, params.kmpl);
  const marginKm = rangeKm - params.distanceToNextPumpKm;
  return { warn: marginKm < reserve, rangeKm, marginKm };
}
