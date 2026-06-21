import { mergeSettlement, type MergeableSettlement } from './settlement';

const s = (over: Partial<MergeableSettlement>): MergeableSettlement => ({
  id: 's1',
  updated_at: '2026-06-20T10:00:00.000Z',
  status: 'pending',
  upi_ref: null,
  ...over,
});

describe('mergeSettlement', () => {
  it('advances to the furthest state', () => {
    expect(mergeSettlement(s({ status: 'pending' }), s({ status: 'confirmed' })).status).toBe(
      'confirmed',
    );
    expect(mergeSettlement(s({ status: 'marked_paid' }), s({ status: 'pending' })).status).toBe(
      'marked_paid',
    );
  });

  it('never moves backward (monotonic), order-independent', () => {
    const a = s({ status: 'confirmed' });
    const b = s({ status: 'marked_paid' });
    expect(mergeSettlement(a, b).status).toBe('confirmed');
    expect(mergeSettlement(b, a).status).toBe('confirmed');
  });

  it('carries a upi_ref added by a forward transition', () => {
    const paid = s({ status: 'marked_paid', upi_ref: 'UPI123', updated_at: '2026-06-20T11:00:00Z' });
    const pending = s({ status: 'marked_paid', upi_ref: null });
    expect(mergeSettlement(paid, pending).upi_ref).toBe('UPI123');
  });

  it('same rank breaks tie on updated_at', () => {
    const older = s({ status: 'marked_paid', updated_at: '2026-06-20T10:00:00Z', upi_ref: 'A' });
    const newer = s({ status: 'marked_paid', updated_at: '2026-06-20T12:00:00Z', upi_ref: 'B' });
    expect(mergeSettlement(older, newer).upi_ref).toBe('B');
  });
});
