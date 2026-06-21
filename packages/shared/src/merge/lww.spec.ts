import { mergeLww, mergeLwwCollection } from './lww';
import type { SyncRow } from './types';

interface Row extends SyncRow {
  name: string;
}
const r = (over: Partial<Row>): Row => ({
  id: 'r1',
  updated_at: '2026-06-20T10:00:00.000Z',
  name: 'a',
  ...over,
});

describe('mergeLww', () => {
  it('later updated_at wins', () => {
    const a = r({ updated_at: '2026-06-20T10:00:00Z', name: 'old' });
    const b = r({ updated_at: '2026-06-20T11:00:00Z', name: 'new' });
    expect(mergeLww(a, b).name).toBe('new');
  });

  it('tie on updated_at breaks on client_updated_at', () => {
    const a = r({ client_updated_at: '2026-06-20T10:00:00Z', name: 'a' });
    const b = r({ client_updated_at: '2026-06-20T12:00:00Z', name: 'b' });
    expect(mergeLww(a, b).name).toBe('b');
  });

  it('full tie breaks on stable id (clock-skew safe), order-independent', () => {
    const a = r({ id: 'aaa', name: 'a' });
    const b = r({ id: 'bbb', name: 'b' });
    expect(mergeLww(a, b)).toEqual(mergeLww(b, a));
  });
});

describe('mergeLwwCollection', () => {
  it('merges by id and sorts canonically', () => {
    const local = [r({ id: 'b', name: 'b' }), r({ id: 'a', name: 'a1' })];
    const remote = [r({ id: 'a', name: 'a2', updated_at: '2026-06-20T12:00:00Z' })];
    const merged = mergeLwwCollection(local, remote);
    expect(merged.map((x) => x.id)).toEqual(['a', 'b']);
    expect(merged.find((x) => x.id === 'a')!.name).toBe('a2');
  });
});
