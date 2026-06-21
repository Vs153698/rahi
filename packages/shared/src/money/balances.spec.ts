import { computeBalances, suggestSettlements } from './balances';

describe('computeBalances', () => {
  it('payer is owed; sharers owe; nets to zero', () => {
    // A pays 300; split equally among A, B, C (100 each).
    const b = computeBalances({
      expenses: [{ id: 'e1', paid_by: 'A', amount_paise: 300 }],
      shares: [
        { expense_id: 'e1', member_id: 'A', share_paise: 100 },
        { expense_id: 'e1', member_id: 'B', share_paise: 100 },
        { expense_id: 'e1', member_id: 'C', share_paise: 100 },
      ],
    });
    expect(b).toEqual({ A: 200, B: -100, C: -100 });
    expect(Object.values(b).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('ignores deleted expenses and their shares', () => {
    const b = computeBalances({
      expenses: [{ id: 'e1', paid_by: 'A', amount_paise: 300, deleted_at: '2026-06-20T00:00:00Z' }],
      shares: [{ expense_id: 'e1', member_id: 'B', share_paise: 100 }],
    });
    expect(b).toEqual({});
  });

  it('confirmed settlements discharge debt; pending ones do not', () => {
    const base = {
      expenses: [{ id: 'e1', paid_by: 'A', amount_paise: 200 }],
      shares: [
        { expense_id: 'e1', member_id: 'A', share_paise: 100 },
        { expense_id: 'e1', member_id: 'B', share_paise: 100 },
      ],
    };
    // B owes A 100.
    expect(computeBalances(base)).toEqual({ A: 100, B: -100 });
    // B confirms paying A 100 → settled.
    const settled = computeBalances({
      ...base,
      settlements: [{ from_member: 'B', to_member: 'A', amount_paise: 100, status: 'confirmed' }],
    });
    expect(settled).toEqual({ A: 0, B: 0 });
    // pending does nothing
    const pending = computeBalances({
      ...base,
      settlements: [{ from_member: 'B', to_member: 'A', amount_paise: 100, status: 'pending' }],
    });
    expect(pending).toEqual({ A: 100, B: -100 });
  });
});

describe('suggestSettlements', () => {
  it('produces transfers that zero out balances', () => {
    const suggestions = suggestSettlements({ A: 200, B: -100, C: -100 });
    expect(suggestions).toEqual(
      expect.arrayContaining([
        { from: 'B', to: 'A', amount_paise: 100 },
        { from: 'C', to: 'A', amount_paise: 100 },
      ]),
    );
    const total = suggestions.reduce((s, x) => s + x.amount_paise, 0);
    expect(total).toBe(200);
  });
});
