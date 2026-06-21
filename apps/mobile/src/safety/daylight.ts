import * as Location from 'expo-location';

import { daylightWarning, type DaylightWarning } from '@rahi/shared';

/**
 * Daylight safety (Task 6.2). Computes whether the rider will reach the remaining
 * distance before dark, using the shared offline sunset math at their current
 * coordinates. No network. Pro-gated by the caller.
 */
export async function checkDaylight(remainingKm: number, paceKmh?: number): Promise<DaylightWarning | null> {
  const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
  if (!loc) return null;
  return daylightWarning({
    now: new Date(),
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    remainingKm,
    paceKmh,
  });
}
