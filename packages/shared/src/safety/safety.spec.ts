import { isCrashSignature, peakG } from './crash';
import { daylightWarning, minutesUntilSunset, sunsetUtc } from './daylight';
import { isCheckInDue, shouldEscalate, type DeadmanState } from './deadman';
import { fuelRangeWarning, learnKmpl } from './fuel';
import { composeSosMessage, deliveryPlan } from './sos';

describe('fuel', () => {
  it('learns kmpl from logs (distance ÷ litres)', () => {
    // 0→300 km on 10 L, 300→640 on 10 L → 640/20 = 32 kmpl
    const kmpl = learnKmpl(
      [
        { odometer_km: 0, litres: 0 },
        { odometer_km: 300, litres: 10 },
        { odometer_km: 640, litres: 10 },
      ],
      30,
    );
    expect(kmpl).toBeCloseTo(32, 1);
  });

  it('falls back to baseline without history', () => {
    expect(learnKmpl([], 28)).toBe(28);
  });

  it('warns when reaching the next pump leaves less than reserve', () => {
    // range = 10 L * 30 = 300 km; pump 290 km away; margin 10 < 15 reserve → warn
    const w = fuelRangeWarning({ litresRemaining: 10, kmpl: 30, distanceToNextPumpKm: 290 });
    expect(w.warn).toBe(true);
    expect(w.rangeKm).toBe(300);
    // comfortable margin → no warning
    expect(fuelRangeWarning({ litresRemaining: 10, kmpl: 30, distanceToNextPumpKm: 100 }).warn).toBe(false);
  });
});

describe('daylight', () => {
  it('computes a plausible sunset (Bengaluru, midsummer ~13:00 UTC)', () => {
    const set = sunsetUtc(new Date('2026-06-21T06:00:00Z'), 12.97, 77.59);
    expect(set).not.toBeNull();
    expect(set!.getUTCHours()).toBeGreaterThanOrEqual(12);
    expect(set!.getUTCHours()).toBeLessThanOrEqual(14);
  });

  it('warns when ETA + buffer exceeds daylight left', () => {
    // sunset ~13:18 UTC; at 12:00 UTC ~78 min left; 100 km @ 40 km/h = 150 min → warn
    const w = daylightWarning({
      now: new Date('2026-06-21T12:00:00Z'),
      lat: 12.97,
      lng: 77.59,
      remainingKm: 100,
    });
    expect(w.warn).toBe(true);
    expect(typeof minutesUntilSunset(new Date('2026-06-21T12:00:00Z'), 12.97, 77.59)).toBe('number');
  });
});

describe('crash', () => {
  const still = (n: number) => Array.from({ length: n }, () => 1);

  it('detects a hard spike followed by stillness', () => {
    const samples = [1, 1, 8.5, 7.2, ...still(10)];
    expect(isCrashSignature(samples)).toBe(true);
    expect(peakG(samples)).toBeGreaterThan(8);
  });

  it('ignores a pothole jolt where the rider keeps moving', () => {
    const moving = Array.from({ length: 10 }, (_, i) => 1 + (i % 2 ? 0.8 : -0.6));
    expect(isCrashSignature([1, 1, 8.0, ...moving])).toBe(false);
  });

  it('ignores normal riding (no spike)', () => {
    expect(isCrashSignature([1, 1.2, 0.9, 1.1, ...still(10)])).toBe(false);
  });
});

describe('sos', () => {
  it('composes a message with a maps link and never auto-sends on iOS', () => {
    const msg = composeSosMessage({ riderName: 'Asha', lat: 12.34567, lng: 77.65432, kind: 'crash_detected' });
    expect(msg).toContain('SOS from Asha');
    expect(msg).toContain('maps.google.com/?q=12.34567,77.65432');
    expect(deliveryPlan('ios').autoSmsAndroid).toBe(false);
    expect(deliveryPlan('ios').preComposedIos).toBe(true);
    expect(deliveryPlan('android').autoSmsAndroid).toBe(true);
    expect(deliveryPlan('android').cloudQueued).toBe(true);
  });
});

describe('deadman', () => {
  const state: DeadmanState = { lastAckMs: 0, intervalMs: 600_000, graceMs: 120_000 };
  it('prompts when interval elapses and escalates after grace', () => {
    expect(isCheckInDue(state, 500_000)).toBe(false);
    expect(isCheckInDue(state, 600_000)).toBe(true);
    expect(shouldEscalate(state, 600_000)).toBe(false);
    expect(shouldEscalate(state, 720_000)).toBe(true);
  });
});
