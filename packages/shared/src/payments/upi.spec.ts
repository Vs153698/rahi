import { buildUpiUri, isLikelyVpa } from './upi';

describe('buildUpiUri', () => {
  it('builds a pre-filled upi://pay link with rupee amount', () => {
    const uri = buildUpiUri({ payeeVpa: 'priya@upi', payeeName: 'Priya', amountPaise: 125050, note: 'Fuel' });
    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=priya%40upi');
    expect(uri).toContain('pn=Priya');
    expect(uri).toContain('am=1250.50');
    expect(uri).toContain('cu=INR');
    expect(uri).toContain('tn=Fuel');
  });

  it('omits the note when not given', () => {
    expect(buildUpiUri({ payeeVpa: 'a@b', payeeName: 'A', amountPaise: 100 })).not.toContain('tn=');
  });
});

describe('isLikelyVpa', () => {
  it('accepts typical VPAs and rejects junk', () => {
    expect(isLikelyVpa('rider123@okhdfcbank')).toBe(true);
    expect(isLikelyVpa('not-a-vpa')).toBe(false);
    expect(isLikelyVpa('@bank')).toBe(false);
  });
});
