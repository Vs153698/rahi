import { downsampleByDistance, haversineMeters, pathLengthMeters } from './track';

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMeters({ lng: 77, lat: 13 }, { lng: 77, lat: 13 })).toBeCloseTo(0, 5);
  });

  it('approximates a known short distance (~1 deg lat ≈ 111 km)', () => {
    const d = haversineMeters({ lng: 77, lat: 12 }, { lng: 77, lat: 13 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe('pathLengthMeters', () => {
  it('sums segment distances', () => {
    const pts = [
      { lng: 77, lat: 12 },
      { lng: 77, lat: 12.5 },
      { lng: 77, lat: 13 },
    ];
    expect(pathLengthMeters(pts)).toBeCloseTo(haversineMeters(pts[0]!, pts[2]!), 0);
  });
});

describe('downsampleByDistance', () => {
  it('keeps endpoints and drops points closer than the threshold', () => {
    const pts = [
      { lng: 77.0, lat: 13.0 },
      { lng: 77.0001, lat: 13.0 }, // ~11 m — dropped at 50 m threshold
      { lng: 77.001, lat: 13.0 }, // ~110 m — kept
      { lng: 77.0011, lat: 13.0 }, // near previous — dropped
      { lng: 77.01, lat: 13.0 }, // last — always kept
    ];
    const out = downsampleByDistance(pts, 50);
    expect(out[0]).toEqual(pts[0]);
    expect(out[out.length - 1]).toEqual(pts[pts.length - 1]);
    expect(out.length).toBeLessThan(pts.length);
  });

  it('returns short tracks unchanged', () => {
    const pts = [{ lng: 1, lat: 1 }, { lng: 2, lat: 2 }];
    expect(downsampleByDistance(pts, 100)).toEqual(pts);
  });
});
