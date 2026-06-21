import { Linking } from 'react-native';

import { buildUpiUri, isLikelyVpa } from '@rahi/shared';

/**
 * Device-side UPI settle-up (Task 5.6, rahi-docs/09 B2). Opens the payer's own
 * UPI app pre-filled via a `upi://pay?...` deep link — money moves bank-to-bank,
 * outside Rahi (no custody). If the payee has no VPA on file, the caller falls
 * back to a QR / "mark settled (cash)" path.
 */
export class NoVpaError extends Error {
  constructor() {
    super('No UPI ID on file for this person — use QR or mark as cash.');
    this.name = 'NoVpaError';
  }
}

export interface UpiSettleParams {
  payeeVpa: string | null;
  payeeName: string;
  amountPaise: number;
  note?: string;
}

/** Open the UPI app for a settlement. Returns false if no UPI app handles it. */
export async function openUpiPayment(params: UpiSettleParams): Promise<boolean> {
  if (!params.payeeVpa || !isLikelyVpa(params.payeeVpa)) throw new NoVpaError();
  const uri = buildUpiUri({
    payeeVpa: params.payeeVpa,
    payeeName: params.payeeName,
    amountPaise: params.amountPaise,
    note: params.note,
  });
  const canOpen = await Linking.canOpenURL(uri).catch(() => false);
  if (!canOpen) return false;
  await Linking.openURL(uri);
  return true;
}
