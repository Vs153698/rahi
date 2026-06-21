import { env } from '../config/env';

/**
 * RevenueCat wiring (Task 0.8). Phase 0 is a STUB: no real products, the
 * configure call is a no-op unless a key is present, and entitlement resolution
 * is handled separately (always-false stub + the synced `entitlements` table
 * shape). Real products + paywall land in Phase 5 (rahi-docs/09, /14).
 *
 * Kept isolated so Phase 5 swaps the implementation without touching call sites.
 */
export async function configureRevenueCat(): Promise<void> {
  if (!env.revenueCatApiKey) {
    // Phase-0 stub: nothing to configure yet.
    return;
  }
  // TODO(phase-5): Purchases.configure({ apiKey: env.revenueCatApiKey });
  // Intentionally not importing react-native-purchases at runtime in Phase 0 to
  // keep the stub side-effect-free until products exist.
}
