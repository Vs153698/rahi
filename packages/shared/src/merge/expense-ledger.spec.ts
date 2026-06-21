import { mergeExpenseLedger, mergeExpensePair, type MergeableExpense } from './expense-ledger';

// Real expenses carry extra fields (note, amount, ...). The reducer is generic
// over them; the test type adds `note` to exercise field carry-through.
interface TestExpense extends MergeableExpense {
  note?: string;
}

const base = (over: Partial<TestExpense> = {}): TestExpense => ({
  id: 'e1',
  updated_at: '2026-06-20T10:00:00.000Z',
  client_updated_at: '2026-06-20T10:00:00.000Z',
  merge_version: 0,
  created_by: 'aaa',
  deleted_at: null,
  ...over,
});

describe('mergeExpensePair', () => {
  it('higher merge_version wins', () => {
    const a = base({ merge_version: 1 });
    const b = base({ merge_version: 3 });
    expect(mergeExpensePair(a, b).merge_version).toBe(3);
  });

  it('equal version breaks tie on client_updated_at', () => {
    const a = base({ merge_version: 2, client_updated_at: '2026-06-20T10:00:00.000Z' });
    const b = base({ merge_version: 2, client_updated_at: '2026-06-20T11:00:00.000Z' });
    expect(mergeExpensePair(a, b)).toBe(b);
  });

  it('equal version + equal time breaks tie on created_by (stable)', () => {
    const a = base({ merge_version: 2, created_by: 'aaa' });
    const b = base({ merge_version: 2, created_by: 'bbb' });
    expect(mergeExpensePair(a, b).created_by).toBe('bbb');
  });

  it('delete wins over a concurrent equal-version edit by default', () => {
    const del = base({ merge_version: 2, deleted_at: '2026-06-20T12:00:00.000Z' });
    const edit = base({ merge_version: 2, note: 'fuel' });
    expect(mergeExpensePair(del, edit).deleted_at).toBeTruthy();
  });

  it('a strictly-later edit beats a delete', () => {
    const del = base({ merge_version: 2, deleted_at: '2026-06-20T12:00:00.000Z' });
    const edit = base({ merge_version: 3, note: 'fuel' });
    expect(mergeExpensePair(del, edit).deleted_at).toBeFalsy();
  });

  it('editBeatsDelete flips the equal-version tie', () => {
    const del = base({ merge_version: 2, deleted_at: '2026-06-20T12:00:00.000Z' });
    const edit = base({ merge_version: 2, note: 'fuel' });
    expect(mergeExpensePair(del, edit, { editBeatsDelete: true }).deleted_at).toBeFalsy();
  });
});

describe('mergeExpenseLedger', () => {
  it('unions independent adds without conflict', () => {
    const local = [base({ id: 'a' })];
    const remote = [base({ id: 'b' })];
    const merged = mergeExpenseLedger(local, remote);
    expect(merged.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('is order-independent: merge(a,b) === merge(b,a)', () => {
    const a = [base({ id: 'x', merge_version: 1 }), base({ id: 'y', merge_version: 5 })];
    const b = [base({ id: 'x', merge_version: 3 }), base({ id: 'z', merge_version: 2 })];
    expect(mergeExpenseLedger(a, b)).toEqual(mergeExpenseLedger(b, a));
  });

  it('keeps the highest-version copy of a shared expense', () => {
    const a = [base({ id: 'x', merge_version: 1, note: 'old' })];
    const b = [base({ id: 'x', merge_version: 4, note: 'new' })];
    const merged = mergeExpenseLedger(a, b);
    expect(merged).toHaveLength(1);
    expect(merged[0]!.note).toBe('new');
  });
});
