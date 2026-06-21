import { checklistProgress, PACKING_CHECKLIST, PERMIT_ZONES } from './checklists';
import { moderationFromFlags } from './hazard';
import { buildOpenMeteoUrl, parseOpenMeteoDaily, roughDays, type OpenMeteoDaily } from './weather';

describe('checklists', () => {
  it('computes progress and remaining items', () => {
    const p = checklistProgress(PACKING_CHECKLIST, new Set(['dl', 'rc']));
    expect(p.total).toBe(PACKING_CHECKLIST.length);
    expect(p.checked).toBe(2);
    expect(p.remaining.find((i) => i.id === 'dl')).toBeUndefined();
    expect(p.fraction).toBeCloseTo(2 / PACKING_CHECKLIST.length, 5);
  });

  it('ships restricted-zone permit info offline', () => {
    expect(PERMIT_ZONES.map((z) => z.id)).toContain('ladakh_inner_line');
    expect(PERMIT_ZONES.every((z) => z.summary.length > 0)).toBe(true);
  });
});

describe('weather', () => {
  it('builds an Open-Meteo URL with daily params', () => {
    const url = buildOpenMeteoUrl('https://api.open-meteo.com', 12.97, 77.59);
    expect(url).toContain('latitude=12.97');
    expect(url).toContain('precipitation_sum');
  });

  it('parses the daily block and flags rough days', () => {
    const body: OpenMeteoDaily = {
      daily: {
        time: ['2026-06-21', '2026-06-22'],
        temperature_2m_max: [30, 28],
        temperature_2m_min: [20, 19],
        precipitation_sum: [2, 35],
        wind_speed_10m_max: [15, 50],
        weather_code: [1, 65],
      },
    };
    const forecast = parseOpenMeteoDaily(body);
    expect(forecast).toHaveLength(2);
    expect(forecast[1]!.precipMm).toBe(35);
    const rough = roughDays(forecast);
    expect(rough).toHaveLength(1);
    expect(rough[0]!.date).toBe('2026-06-22');
  });

  it('handles a missing daily block', () => {
    expect(parseOpenMeteoDaily({})).toEqual([]);
  });
});

describe('hazard moderation', () => {
  it('stays visible below the flag threshold', () => {
    expect(moderationFromFlags({ confirmations: 5, flagCount: 2 })).toBe('visible');
  });

  it('auto-hides for review when flags reach threshold and outweigh confirmations', () => {
    expect(moderationFromFlags({ confirmations: 1, flagCount: 3 })).toBe('under_review');
  });

  it('stays visible when confirmations outweigh flags', () => {
    expect(moderationFromFlags({ confirmations: 10, flagCount: 4 })).toBe('visible');
  });

  it('respects an admin override', () => {
    expect(moderationFromFlags({ confirmations: 0, flagCount: 0, adminOverride: 'removed' })).toBe('removed');
  });
});
