# Phase 5 — Payments, Subscriptions & Entitlements — exit-gate checklist

Tracks Phase 5 (`../rahi-docs/_build-tasks/phase-5.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/09`, `../rahi-docs/14`.
✅ = built + verified (mocked). ⏳ = needs store/Razorpay accounts or a device.

## Tasks

- [x] **5.1 Store products (doc)** — `infra/STORE-SETUP.md`: `pro_monthly`/`pro_annual` + 7-day trial across App Store Connect (Small Business Program) + Play, mapped to one RevenueCat `pro` entitlement + offering. (Store config can't be created from here.)
- [x] **5.2 Paywall + purchase** — `entitlement/paywall/Paywall.tsx` (annual pre-selected, 7-day trial framing, mandatory Restore) + `revenuecat.ts` (`getOfferings`/`purchasePackage`/`restorePurchases`/`getCustomerInfo`). Wired into the Pro tab.
- [x] **5.3 Server validation + webhook** — `billing/billing.controller.ts` (authenticated RevenueCat webhook) + shared pure `mapRevenueCatEvent` (purchase/renewal/cancel/billing-issue/expiry → status + entitlement) → `billing.repository.ts` persists `subscriptions`/`entitlements` (service role). Client can't self-grant.
- [x] **5.4 Offline entitlement grace (critical)** — `entitlement/grace.ts` + shared `computeGraceUntil`/`resolveWithGrace`: validate online → stamp `last_validated_at` + `grace_until` in device-local `entitlement_cache_meta`; trust cached active until grace; bounded. `useEntitlement` now combines server truth + grace (replaces the Phase 0 stub).
- [x] **5.5 Razorpay pool pay-in** — `payments/razorpay/razorpay.client.ts` (order + **server-side HMAC signature verification**, constant-time) + `payments.controller.ts` (order/verify) + `payments.repository.ts` (**idempotent** on `razorpay_payment_id` → `kitty_contribution`).
- [x] **5.6 UPI settle-up** — `payments/upi.ts` (`upi://pay` deep link via shared `buildUpiUri`, no-VPA fallback) + `payments/settlements.repository.ts` (state machine pending → marked_paid → confirmed, offline record). No fund custody.
- [x] **5.7 Rail separation guard** — shared `assertRail`/`RailViolationError` runtime guard + `scripts/check-rails.sh` CI static check (forbids subscription↔Razorpay/UPI and trip-money↔IAP cross-imports). Wired into CI.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Subscribe (trial→pro) both platforms; Pro unlocks; restore works | ✅ code / ⏳ device+stores | `Paywall.tsx`, `revenuecat.ts` |
| Lifecycle events update server record; device reflects; no self-grant | ✅ code / ⏳ live RC | `billing/*`, `mapRevenueCatEvent` |
| Entitlement survives multi-day offline via grace; cancelled ends after grace | ✅ logic | `grace.ts`, `resolveWithGrace` (tested) |
| Pool pay-in collects online; signature verified server-side; no double-credit | ✅ logic | `razorpay.client.ts` (HMAC), idempotent repo |
| Settle-up opens UPI pre-filled; state syncs; offline record works | ✅ code / ⏳ device | `upi.ts`, `settlements.repository.ts` |
| Subscription never via Razorpay/UPI; trip money never via IAP | ✅ guarded | `assertRail` + `check-rails.sh` |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **71 unit tests pass** (added rail-separation, UPI link, RevenueCat event mapping; grace math).
- Razorpay HMAC verify proven (valid accepted, forged rejected) via node crypto.
- All 17 Phase 5 files parse clean; **rail separation guard passes** on the tree.

## Deferred (needs provisioning / device)

- Real store products + RevenueCat dashboard wiring; live webhook delivery.
- On-device purchase/restore/grace and a live Razorpay order/checkout on a dev-client build.
