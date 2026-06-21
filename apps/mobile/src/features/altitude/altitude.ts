import { Barometer } from 'expo-sensors';

import {
  amsAscentWarning,
  ascentOverWindow,
  pressureChange,
  pressureToAltitudeM,
  stormWarning,
  type AltSample,
  type PressureSample,
} from '@rahi/shared';

/**
 * Altitude / AMS / storm monitor (Task 10.3). Reads the barometer (no network),
 * keeps a rolling altitude + pressure history, and surfaces an ascent-rate AMS
 * warning and a rapid-pressure-drop storm warning via the shared pure math.
 */
const DAY_MS = 24 * 3600 * 1000;
const THREE_HOURS_MS = 3 * 3600 * 1000;

export interface AltitudeStatus {
  altitudeM: number;
  pressureHpa: number;
  ams: { warn: boolean; reason: string | null };
  storm: boolean;
}

export interface AltitudeMonitorHandle {
  stop: () => void;
}

export function startAltitudeMonitor(onUpdate: (s: AltitudeStatus) => void): AltitudeMonitorHandle {
  const alt: AltSample[] = [];
  const press: PressureSample[] = [];

  Barometer.setUpdateInterval(5000);
  const sub = Barometer.addListener(({ pressure }) => {
    // expo-sensors reports pressure in hPa.
    const t = Date.now();
    const altitudeM = pressureToAltitudeM(pressure);
    alt.push({ altitudeM, t });
    press.push({ hpa: pressure, t });
    // Trim to a day.
    while (alt.length && t - alt[0]!.t > DAY_MS) alt.shift();
    while (press.length && t - press[0]!.t > DAY_MS) press.shift();

    const ascent24h = ascentOverWindow(alt, DAY_MS, t);
    const drop3h = pressureChange(press, THREE_HOURS_MS, t);
    onUpdate({
      altitudeM,
      pressureHpa: Math.round(pressure * 10) / 10,
      ams: amsAscentWarning(altitudeM, ascent24h),
      storm: stormWarning(drop3h),
    });
  });

  return { stop: () => sub.remove() };
}
