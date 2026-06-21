# Subscription store setup (Phase 5 Task 5.1)

The subscription is a **digital entitlement** and MUST be sold through the stores
(Apple IAP + Google Play Billing) — never Razorpay/UPI (rahi-docs/09 Part C). This
is config in three dashboards; the app reads it via RevenueCat. // verify against
current store UIs at execution time.

## Products (one `pro` entitlement, two durations)

| RevenueCat product | Store SKU | Duration | Trial |
|---|---|---|---|
| `pro_monthly` | App Store + Play subscription | 1 month | 7-day free |
| `pro_annual` | App Store + Play subscription | 1 year (hero) | 7-day free |

Pricing (India-tuned, rahi-docs/14): **₹199/mo**, **₹999/yr**. Reconcile against
live store pages before committing.

## App Store Connect

1. Create an **auto-renewable subscription group** (e.g. "Rahi Pro").
2. Add `pro_monthly` and `pro_annual` in that group.
3. Add a **7-day free trial** introductory offer to each.
4. Enrol the app in the **Small Business Program** (15% rate).

## Google Play Console

1. Create a **subscription** with two **base plans** (monthly, annual).
2. Add a **free-trial offer** (7 days) to each base plan.
3. Play Billing Library 9.x (// verify current).

## RevenueCat

1. Connect both stores (App Store shared secret + Play service account).
2. Create one **entitlement** `pro`.
3. Map both products' purchases to `pro`.
4. Create an **offering** "default" with `monthly` + `annual` packages.
5. Configure the **webhook** → `POST {API}/billing/revenuecat/webhook` with the
   shared `Authorization` header value stored as `REVENUECAT_WEBHOOK_AUTH_HEADER`
   (Doppler `rahi-api`). Public SDK key → `EXPO_PUBLIC_REVENUECAT_API_KEY`
   (Doppler `rahi-mobile` / EAS); secret key → `REVENUECAT_SECRET_API_KEY`
   (Doppler `rahi-api`).

## Acceptance (on a real device)

`Purchases.getOfferings()` returns the `default` offering with `monthly` + `annual`
packages, each showing the 7-day trial.
