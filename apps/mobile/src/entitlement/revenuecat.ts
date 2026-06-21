import Purchases, { type PurchasesOffering, type CustomerInfo } from 'react-native-purchases';

import { PRO_ENTITLEMENT } from '@rahi/shared';

import { env } from '../config/env';

/**
 * RevenueCat wiring (rahi-docs/09 A1/A3, Task 5.2). One `pro` entitlement maps
 * both stores' products. Subscriptions are the STORE rail only — never Razorpay/
 * UPI (rahi-docs/09 Part C). Server-side receipt validation + webhooks make the
 * server authoritative; this client only initiates purchases and reads the
 * resulting entitlement.
 */
let configured = false;

export function configureRevenueCat(appUserId?: string): void {
  if (configured || !env.revenueCatApiKey) return;
  Purchases.configure({ apiKey: env.revenueCatApiKey, appUserID: appUserId ?? null });
  configured = true;
}

export async function getProOffering(): Promise<PurchasesOffering | null> {
  if (!configured) return null;
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

/** True if the customer currently has an active `pro` entitlement (online check). */
export function hasProEntitlement(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT] != null;
}

export async function purchaseAnnualOrMonthly(annual: boolean): Promise<boolean> {
  const offering = await getProOffering();
  const pkg = annual ? offering?.annual : offering?.monthly;
  if (!pkg) throw new Error('Subscription plan unavailable');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return hasProEntitlement(customerInfo);
}

/** Restore purchases — mandatory per store policy (rahi-docs/09 A5). */
export async function restorePurchases(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  return hasProEntitlement(info);
}

/** Online validation: returns active flag + expiry for grace stamping. */
export async function validatePro(): Promise<{ active: boolean; expiresAt: string | null }> {
  if (!configured) return { active: false, expiresAt: null };
  const info = await Purchases.getCustomerInfo();
  const ent = info.entitlements.active[PRO_ENTITLEMENT];
  return { active: ent != null, expiresAt: ent?.expirationDate ?? null };
}
