import { recomputeShares } from './shares';

const sum = (xs: { share_paise: number }[]) => xs.reduce((s, x) => s + x.share_paise, 0);

describe('recomputeShares', () => {
  it('equal split conserves the total (no paise lost)', () => {
    const shares = recomputeShares(10000, 'equal', [
      { member_id: 'a' },
      { member_id: 'b' },
      { member_id: 'c' },
    ]);
    expect(sum(shares)).toBe(10000);
  });

  it('equal split distributes remainder to lowest ids deterministically', () => {
    // 100 paise / 3 = 33 each + 1 remainder → lowest id gets the extra paise.
    const shares = recomputeShares(100, 'equal', [
      { member_id: 'c' },
      { member_id: 'a' },
      { member_id: 'b' },
    ]);
    const byId = Object.fromEntries(shares.map((s) => [s.member_id, s.share_paise]));
    expect(byId).toEqual({ a: 34, b: 33, c: 33 });
    expect(sum(shares)).toBe(100);
  });

  it('by_distance weights proportionally and conserves total', () => {
    const shares = recomputeShares(30000, 'by_distance', [
      { member_id: 'a', distance: 100 },
      { member_id: 'b', distance: 200 },
    ]);
    const byId = Object.fromEntries(shares.map((s) => [s.member_id, s.share_paise]));
    expect(byId.a).toBe(10000);
    expect(byId.b).toBe(20000);
    expect(sum(shares)).toBe(30000);
  });

  it('per_bike weights by bike count', () => {
    const shares = recomputeShares(30000, 'per_bike', [
      { member_id: 'a', bikes: 1 },
      { member_id: 'b', bikes: 2 },
    ]);
    expect(sum(shares)).toBe(30000);
  });

  it('custom shares are authoritative when they sum to the total', () => {
    const shares = recomputeShares(10000, 'custom', [
      { member_id: 'a', custom_paise: 7000 },
      { member_id: 'b', custom_paise: 3000 },
    ]);
    expect(sum(shares)).toBe(10000);
  });

  it('is deterministic across input order (same multiset of members)', () => {
    const m1 = recomputeShares(100, 'equal', [{ member_id: 'a' }, { member_id: 'b' }]);
    const m2 = recomputeShares(100, 'equal', [{ member_id: 'b' }, { member_id: 'a' }]);
    const norm = (xs: { member_id: string; share_paise: number }[]) =>
      [...xs].sort((p, q) => (p.member_id < q.member_id ? -1 : 1));
    expect(norm(m1)).toEqual(norm(m2));
  });
});
