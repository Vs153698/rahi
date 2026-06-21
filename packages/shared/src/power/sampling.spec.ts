import { adaptiveSamplingSeconds, MAX_INTERVAL_S, MIN_INTERVAL_S, powerMode } from './sampling';

describe('adaptiveSamplingSeconds', () => {
  it('samples faster at speed than when stopped', () => {
    const fast = adaptiveSamplingSeconds({ speedKmh: 80, batteryFraction: 0.9, charging: false });
    const stopped = adaptiveSamplingSeconds({ speedKmh: 0, batteryFraction: 0.9, charging: false });
    expect(fast).toBeLessThan(stopped);
  });

  it('backs off on low battery when not charging', () => {
    const normal = adaptiveSamplingSeconds({ speedKmh: 50, batteryFraction: 0.9, charging: false });
    const low = adaptiveSamplingSeconds({ speedKmh: 50, batteryFraction: 0.1, charging: false });
    expect(low).toBeGreaterThan(normal);
  });

  it('ignores low-battery backoff while charging', () => {
    const charging = adaptiveSamplingSeconds({ speedKmh: 50, batteryFraction: 0.1, charging: true });
    const normal = adaptiveSamplingSeconds({ speedKmh: 50, batteryFraction: 0.9, charging: false });
    expect(charging).toBe(normal);
  });

  it('stays within bounds', () => {
    const v = adaptiveSamplingSeconds({ speedKmh: 0, batteryFraction: 0.05, charging: false });
    expect(v).toBeLessThanOrEqual(MAX_INTERVAL_S);
    expect(v).toBeGreaterThanOrEqual(MIN_INTERVAL_S);
  });
});

describe('powerMode', () => {
  it('reports saver on low battery, trip when moving', () => {
    expect(powerMode({ speedKmh: 40, batteryFraction: 0.1, charging: false })).toBe('saver');
    expect(powerMode({ speedKmh: 40, batteryFraction: 0.9, charging: false })).toBe('trip');
    expect(powerMode({ speedKmh: 0, batteryFraction: 0.9, charging: false })).toBe('balanced');
  });
});
