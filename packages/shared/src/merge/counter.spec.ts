import { mergeCounter, mergeHazard, mergeMostRestrictive, type MergeableHazard } from './counter';

describe('mergeCounter', () => {
  it('falls back to max with no common base', () => {
    expect(mergeCounter(3, 5)).toBe(5);
  });

  it('adds increments above a known base (no double-count)', () => {
    // base 4; device A added 2 (=6), device B added 1 (=5) → 4+2+1 = 7
    expect(mergeCounter(6, 5, 4)).toBe(7);
  });

  it('never goes negative', () => {
    expect(mergeCounter(0, 0, 5)).toBe(0);
  });
});

describe('mergeMostRestrictive', () => {
  it('removed beats under_review beats visible', () => {
    expect(mergeMostRestrictive('visible', 'removed')).toBe('removed');
    expect(mergeMostRestrictive('under_review', 'visible')).toBe('under_review');
  });
});

describe('mergeHazard', () => {
  const h = (over: Partial<MergeableHazard>): MergeableHazard => ({
    id: 'h1',
    updated_at: '2026-06-20T10:00:00.000Z',
    confirmations: 0,
    flag_count: 0,
    moderation_status: 'visible',
    ...over,
  });

  it('merges counters additively and keeps the most restrictive status', () => {
    const a = h({ confirmations: 6, moderation_status: 'visible' });
    const b = h({ confirmations: 5, moderation_status: 'under_review' });
    const merged = mergeHazard(a, b, { confirmations: 4, flag_count: 0 });
    expect(merged.confirmations).toBe(7);
    expect(merged.moderation_status).toBe('under_review');
  });

  it('is order-independent', () => {
    const a = h({ confirmations: 3, flag_count: 1 });
    const b = h({ confirmations: 2, flag_count: 4, moderation_status: 'removed' });
    expect(mergeHazard(a, b)).toEqual(mergeHazard(b, a));
  });
});
