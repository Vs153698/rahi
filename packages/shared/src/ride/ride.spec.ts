import { amsAscentWarning, ascentOverWindow, pressureToAltitudeM, stormWarning } from '../altitude/barometry';
import { deadZoneAhead, shouldEagerFlush, type RouteCell } from '../sync/coverage';

import { awardBadges } from './badges';
import { computeRideStats, type TrackSample } from './stats';

const T0 = Date.parse('2026-06-21T06:00:00Z');
const sample = (lng: number, lat: number, altitudeM: number, minutes: number, stateTag?: string): TrackSample => ({
  lng,
  lat,
  altitudeM,
  recordedAt: new Date(T0 + minutes * 60000).toISOString(),
  stateTag,
});

describe('ride stats + badges', () => {
  it('computes distance, max altitude, elevation gain', () => {
    const stats = computeRideStats([
      sample(77.0, 13.0, 900, 0, 'KA'),
      sample(77.0, 13.5, 1500, 60, 'KA'),
      sample(77.0, 14.0, 1200, 120, 'AP'),
    ]);
    expect(stats.maxAltitudeM).toBe(1500);
    expect(stats.elevationGainM).toBe(600); // only positive deltas
    expect(stats.distanceKm).toBeGreaterThan(100);
    expect(stats.statesCrossed).toBe(2);
  });

  it('awards altitude + multi-state badges from stats', () => {
    const badges = awardBadges({
      distanceKm: 1200,
      maxAltitudeM: 4200,
      elevationGainM: 3000,
      durationMinutes: 600,
      longestDayKm: 320,
      statesCrossed: 3,
    });
    expect(badges).toEqual(
      expect.arrayContaining(['altitude_4000', 'altitude_3000', 'long_day_300', 'distance_1000', 'multi_state_3']),
    );
    expect(badges).not.toContain('altitude_5000');
  });
});

describe('barometry / AMS / storm', () => {
  it('converts pressure to altitude (sea level ≈ 0 m, ~540 hPa ≈ 5000 m)', () => {
    expect(pressureToAltitudeM(1013.25)).toBe(0);
    expect(pressureToAltitudeM(540)).toBeGreaterThan(4800);
  });

  it('flags AMS on fast ascent above 3000 m', () => {
    const now = T0 + 24 * 3600 * 1000;
    const samples = [
      { altitudeM: 2800, t: T0 },
      { altitudeM: 3600, t: now - 1000 },
    ];
    const gain = ascentOverWindow(samples, 24 * 3600 * 1000, now);
    expect(gain).toBe(800);
    expect(amsAscentWarning(3600, gain).warn).toBe(true);
    expect(amsAscentWarning(2500, 800).warn).toBe(false); // below 3000 m
  });

  it('warns on a rapid pressure drop', () => {
    expect(stormWarning(-4)).toBe(true);
    expect(stormWarning(-1)).toBe(false);
  });
});

describe('coverage-aware sync', () => {
  const cells: RouteCell[] = [
    { lng: 77, lat: 13.0, hasSignal: true, alongKm: 0 },
    { lng: 77, lat: 13.2, hasSignal: false, alongKm: 10 },
    { lng: 77, lat: 13.4, hasSignal: false, alongKm: 40 },
    { lng: 77, lat: 13.6, hasSignal: true, alongKm: 55 },
  ];

  it('warns about a long dead stretch ahead', () => {
    const d = deadZoneAhead(cells, 15);
    expect(d.warn).toBe(true);
    expect(d.startsInKm).toBe(10);
    expect(d.deadStretchKm).toBeGreaterThanOrEqual(30);
  });

  it('eagerly flushes when entering signal with pending work', () => {
    expect(shouldEagerFlush({ enteredSignal: true, pendingMutations: 3 })).toBe(true);
    expect(shouldEagerFlush({ enteredSignal: true, pendingMutations: 0 })).toBe(false);
    expect(shouldEagerFlush({ enteredSignal: false, pendingMutations: 9 })).toBe(false);
  });
});
