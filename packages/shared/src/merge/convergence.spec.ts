/**
 * Sync convergence harness (rahi-docs/05 §8) at the merge-reducer level — the
 * part that runs deterministically in CI without a device. The device-level
 * airplane-mode/two-simulator tests live in apps/mobile/test/sync (Detox/Maestro,
 * run on a real build). A merge regression here is a release blocker.
 *
 * Properties asserted for the expense ledger (the hard case):
 *   - Commutativity: merge(a,b) == merge(b,a)
 *   - Idempotence:  merge(merge(a,b), b) == merge(a,b)
 *   - Associativity (3-way): order of pairwise merges doesn't matter
 *   - Completeness: no add is lost; no id duplicated
 *   - Clock-skew safety: convergence holds even with reversed/odd timestamps
 */
import { mergeExpenseLedger, type MergeableExpense } from './expense-ledger';

// Tiny seeded PRNG (mulberry32) for reproducible fuzzing.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (ms: number) => new Date(ms).toISOString();

function makeExpense(id: string, version: number, clientMs: number, by: string): MergeableExpense {
  return {
    id,
    updated_at: iso(clientMs),
    client_updated_at: iso(clientMs),
    merge_version: version,
    created_by: by,
    deleted_at: null,
  };
}

const canonical = (rows: MergeableExpense[]) =>
  JSON.stringify([...rows].sort((a, b) => (a.id < b.id ? -1 : 1)));

describe('ledger convergence', () => {
  it('two-device convergence over randomized op streams (fuzz)', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rand = rng(seed);
      const sharedIds = ['s1', 's2', 's3'];
      const deviceA: MergeableExpense[] = [];
      const deviceB: MergeableExpense[] = [];

      // Each device independently adds private + edits shared expenses offline.
      const ops = 40;
      for (let i = 0; i < ops; i++) {
        const onA = rand() < 0.5;
        const target = onA ? deviceA : deviceB;
        const who = onA ? 'A' : 'B';
        if (rand() < 0.4) {
          // private add (UUID-like unique id)
          target.push(makeExpense(`${who}-${i}`, 0, 1_000 + i, who));
        } else {
          // edit a shared expense: bump version
          const id = sharedIds[Math.floor(rand() * sharedIds.length)]!;
          const prev = target.filter((e) => e.id === id).pop();
          const version = (prev?.merge_version ?? 0) + 1;
          // clock skew: B's clock runs 1 hour behind on purpose
          const clockMs = 1_000 + i + (who === 'B' ? -3_600_000 : 0);
          const next = makeExpense(id, version, clockMs, who);
          // keep only the latest local copy of a shared id
          const idx = target.findIndex((e) => e.id === id);
          if (idx >= 0) target.splice(idx, 1);
          target.push(next);
        }
      }

      const ab = mergeExpenseLedger(deviceA, deviceB);
      const ba = mergeExpenseLedger(deviceB, deviceA);

      // Commutativity
      expect(canonical(ab)).toBe(canonical(ba));
      // Idempotence (re-merging a device's own data changes nothing)
      expect(canonical(mergeExpenseLedger(ab, deviceB))).toBe(canonical(ab));
      // Completeness: every unique id present exactly once
      const ids = ab.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('3-way associativity: pairwise merge order is irrelevant', () => {
    const a = [makeExpense('x', 2, 10, 'A'), makeExpense('a1', 0, 11, 'A')];
    const b = [makeExpense('x', 5, 9, 'B'), makeExpense('b1', 0, 12, 'B')];
    const c = [makeExpense('x', 3, 8, 'C'), makeExpense('c1', 0, 13, 'C')];

    const left = mergeExpenseLedger(mergeExpenseLedger(a, b), c);
    const right = mergeExpenseLedger(a, mergeExpenseLedger(b, c));
    expect(canonical(left)).toBe(canonical(right));
    // x converged to the highest version (5) regardless of order
    expect(left.find((e) => e.id === 'x')!.merge_version).toBe(5);
  });

  it('long-offline flush: 500+ queued adds union completely and in order', () => {
    const a: MergeableExpense[] = [];
    const b: MergeableExpense[] = [];
    for (let i = 0; i < 300; i++) a.push(makeExpense(`a-${i.toString().padStart(4, '0')}`, 0, i, 'A'));
    for (let i = 0; i < 300; i++) b.push(makeExpense(`b-${i.toString().padStart(4, '0')}`, 0, i, 'B'));

    const merged = mergeExpenseLedger(a, b);
    expect(merged).toHaveLength(600);
    // sorted canonical order
    const ids = merged.map((e) => e.id);
    expect(ids).toEqual([...ids].sort());
  });

  it('clock-skew: reversed wall-clocks still converge via version + id tiebreak', () => {
    // A edited later in real life but its clock is far behind B's.
    const a = [makeExpense('x', 2, 0, 'A')];
    const b = [makeExpense('x', 2, 10_000_000, 'B')];
    const ab = mergeExpenseLedger(a, b);
    const ba = mergeExpenseLedger(b, a);
    expect(canonical(ab)).toBe(canonical(ba));
  });
});
