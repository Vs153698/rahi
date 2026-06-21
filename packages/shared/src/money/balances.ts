/**
 * Settle-up balance calculation (rahi-docs/04 §4, /05 §4). Pure + deterministic
 * so the same balances are computed on every device from the merged ledger — no
 * separate balance state to conflict. All amounts in paise (integers).
 *
 * Net balance per member = what they paid − what they owe (their shares),
 * adjusted by confirmed settlements. Positive = the group owes them; negative =
 * they owe the group. The sum across all members is always zero.
 */
export interface BalanceExpense {
  id: string;
  paid_by: string | null; // member id
  amount_paise: number;
  deleted_at?: string | null;
}

export interface BalanceShare {
  expense_id: string;
  member_id: string;
  share_paise: number;
}

export interface BalanceSettlement {
  from_member: string;
  to_member: string;
  amount_paise: number;
  status: 'pending' | 'marked_paid' | 'confirmed';
}

export type MemberBalances = Record<string, number>;

export function computeBalances(input: {
  expenses: BalanceExpense[];
  shares: BalanceShare[];
  settlements?: BalanceSettlement[];
}): MemberBalances {
  const balances: MemberBalances = {};
  const add = (member: string, delta: number): void => {
    balances[member] = (balances[member] ?? 0) + delta;
  };

  const liveExpenseIds = new Set<string>();
  for (const e of input.expenses) {
    if (e.deleted_at) continue;
    liveExpenseIds.add(e.id);
    if (e.paid_by) add(e.paid_by, e.amount_paise); // payer is owed what they fronted
  }

  for (const s of input.shares) {
    if (!liveExpenseIds.has(s.expense_id)) continue; // ignore shares of deleted expenses
    add(s.member_id, -s.share_paise); // each member owes their share
  }

  // A confirmed settlement: the payer (from) has discharged that much of their
  // debt; the receiver (to) has been paid back.
  for (const st of input.settlements ?? []) {
    if (st.status !== 'confirmed') continue;
    add(st.from_member, st.amount_paise);
    add(st.to_member, -st.amount_paise);
  }

  return balances;
}

/** Greedy minimal settle-up suggestions: who pays whom to zero out balances. */
export interface SettleSuggestion {
  from: string;
  to: string;
  amount_paise: number;
}

export function suggestSettlements(balances: MemberBalances): SettleSuggestion[] {
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const out: SettleSuggestion[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const pay = Math.min(d.amount, c.amount);
    if (pay > 0) out.push({ from: d.id, to: c.id, amount_paise: pay });
    d.amount -= pay;
    c.amount -= pay;
    if (d.amount === 0) i++;
    if (c.amount === 0) j++;
  }
  return out;
}
