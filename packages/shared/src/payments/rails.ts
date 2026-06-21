/**
 * The hard line between the two money rails (rahi-docs/09 Part C, Task 5.7).
 * Crossing them is fatal — store removal (subscription over UPI) or fintech
 * licensing exposure (trip money over IAP). This runtime guard makes a crossed
 * rail throw at the call site; a CI grep additionally forbids cross-imports.
 */
export type PaymentPurpose = 'subscription' | 'trip_money';
export type PaymentRail = 'store_iap' | 'razorpay' | 'upi';

/** Which rails are legal for each purpose. */
const ALLOWED: Record<PaymentPurpose, PaymentRail[]> = {
  // Digital entitlement — Apple IAP / Google Play Billing ONLY.
  subscription: ['store_iap'],
  // Real-world money between riders — Razorpay pay-in / UPI settle-up ONLY.
  trip_money: ['razorpay', 'upi'],
};

export class RailViolationError extends Error {
  constructor(purpose: PaymentPurpose, rail: PaymentRail) {
    super(
      `Rail violation: "${purpose}" must never use "${rail}". ` +
        `Subscriptions go through the stores only; trip money through Razorpay/UPI only (rahi-docs/09).`,
    );
    this.name = 'RailViolationError';
  }
}

export function isRailAllowed(purpose: PaymentPurpose, rail: PaymentRail): boolean {
  return ALLOWED[purpose].includes(rail);
}

/** Throw if a payment purpose is routed through the wrong rail. */
export function assertRail(purpose: PaymentPurpose, rail: PaymentRail): void {
  if (!isRailAllowed(purpose, rail)) throw new RailViolationError(purpose, rail);
}
