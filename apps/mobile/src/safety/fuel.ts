import { SYNC_TABLES, fuelRangeWarning, learnKmpl, type FuelWarning } from '@rahi/shared';

import { db } from '../db/powersync';
import { poiRepository } from '../features/poi/poi.repository';

/**
 * Fuel-range safety (Task 6.1). Learns the bike's real mileage from `fuel_logs`,
 * finds the nearest cached fuel POI on the route, and warns before a dry stretch
 * — all offline (uses shared pure math). Pro-gated by the caller.
 */
export async function checkFuelRange(params: {
  bikeId: string;
  tripId: string;
  isPro: boolean;
  at: { lng: number; lat: number };
  litresRemaining: number;
}): Promise<FuelWarning | null> {
  const logs = await db.getAll<{ odometer_km: number; litres: number }>(
    `SELECT odometer_km, litres FROM ${SYNC_TABLES.fuel_logs} WHERE bike_id = ? ORDER BY odometer_km ASC`,
    [params.bikeId],
  );
  const bike = await db.getAll<{ baseline_kmpl: number | null }>(
    `SELECT baseline_kmpl FROM ${SYNC_TABLES.bikes} WHERE id = ? LIMIT 1`,
    [params.bikeId],
  );
  const baseline = bike[0]?.baseline_kmpl ?? 30;
  const kmpl = learnKmpl(logs, baseline);

  const nearest = await poiRepository.nearest(params.tripId, params.at, 'fuel', {
    isPro: params.isPro,
    limit: 1,
  });
  const next = nearest[0];
  if (!next) return null; // no cached pump ahead — nothing to compare against

  return fuelRangeWarning({
    litresRemaining: params.litresRemaining,
    kmpl,
    distanceToNextPumpKm: next.distanceM / 1000,
  });
}
