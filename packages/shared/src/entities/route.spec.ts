import { parseGraphHopperPath, type GraphHopperPath } from './route';

const path: GraphHopperPath = {
  distance: 125_400,
  time: 9_000_000,
  points: { type: 'LineString', coordinates: [[77.5, 12.9], [77.6, 13.0], [77.7, 13.1]] },
  instructions: [
    { text: 'Head north', distance: 1200, time: 90_000, sign: 0, interval: [0, 1] },
    { text: 'Turn right onto NH48', distance: 124_200, time: 8_910_000, sign: 2, interval: [1, 2] },
    { text: 'Arrive', distance: 0, time: 0, sign: 4, interval: [2, 2] },
  ],
};

describe('parseGraphHopperPath', () => {
  it('maps coordinates straight through (GeoJSON order)', () => {
    expect(parseGraphHopperPath(path).coordinates).toEqual(path.points.coordinates);
  });

  it('converts distance to km rounded to 2dp', () => {
    expect(parseGraphHopperPath(path).distanceKm).toBe(125.4);
  });

  it('maps each instruction with text, distance, time and sign', () => {
    const r = parseGraphHopperPath(path);
    expect(r.instructions).toHaveLength(3);
    expect(r.instructions[1]).toEqual({
      text: 'Turn right onto NH48',
      distanceM: 124_200,
      timeMs: 8_910_000,
      sign: 2,
    });
  });
});
