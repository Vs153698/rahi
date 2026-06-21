import { assertRail } from './rails';

/**
 * UPI settle-up deep link (rahi-docs/09 B2, Task 5.6). Builds a `upi://pay?...`
 * URI that opens the payer's own bank app pre-filled — money moves bank-to-bank,
 * OUTSIDE Rahi (no custody). Trip money only; asserts the rail.
 */
export interface UpiPayParams {
  /** Payee VPA, e.g. "rider@upi". */
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  note?: string;
}

function encode(v: string): string {
  return encodeURIComponent(v);
}

export function buildUpiUri(params: UpiPayParams): string {
  assertRail('trip_money', 'upi');
  const rupees = (params.amountPaise / 100).toFixed(2);
  const q = [
    `pa=${encode(params.payeeVpa)}`,
    `pn=${encode(params.payeeName)}`,
    `am=${encode(rupees)}`,
    'cu=INR',
  ];
  if (params.note) q.push(`tn=${encode(params.note)}`);
  return `upi://pay?${q.join('&')}`;
}

/** True for a syntactically plausible VPA (user@handle). Not authoritative. */
export function isLikelyVpa(vpa: string): boolean {
  return /^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9.\-_]{1,64}$/i.test(vpa);
}
