import * as Location from 'expo-location';

/**
 * Location beacon (Task 6.4). Periodically captures the rider's position so a
 * contact can follow along; the position rides the durable sync queue / SOS path
 * and is delivered when signal allows. Pro-gated by the caller. Minimal Phase-6
 * implementation: an interval that reports the latest fix to a callback (the
 * caller persists/sends it). Background delivery shares the track recorder's
 * foreground service.
 */
export interface BeaconHandle {
  stop: () => void;
}

export function startBeacon(
  onFix: (fix: { lng: number; lat: number; at: string }) => void,
  intervalMs = 5 * 60 * 1000,
): BeaconHandle {
  let stopped = false;
  const tick = async (): Promise<void> => {
    if (stopped) return;
    const loc = await Location.getCurrentPositionAsync({}).catch(() => null);
    if (loc) {
      onFix({
        lng: loc.coords.longitude,
        lat: loc.coords.latitude,
        at: new Date(loc.timestamp).toISOString(),
      });
    }
  };
  void tick();
  const id = setInterval(() => void tick(), intervalMs);
  return {
    stop: () => {
      stopped = true;
      clearInterval(id);
    },
  };
}
