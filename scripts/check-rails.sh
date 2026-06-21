#!/usr/bin/env bash
# Rail separation guard (rahi-docs/09 Part C, Phase 5 Task 5.7).
# Fails CI if the two money rails are crossed at the import level:
#   - the subscription path (entitlement/) must NEVER touch Razorpay/UPI
#   - the trip-money path (payments/) must NEVER touch the store IAP SDK
# The runtime `assertRail` guard (packages/shared/src/payments/rails.ts) backs
# this up; this static check catches a crossed wire before it ships.
set -euo pipefail

fail=0
root="$(cd "$(dirname "$0")/.." && pwd)"

check() {
  local label="$1" dir="$2" pattern="$3"
  if [ -d "$root/$dir" ] && grep -RInE "$pattern" "$root/$dir" >/dev/null 2>&1; then
    echo "RAIL VIOLATION: $label"
    grep -RInE "$pattern" "$root/$dir" || true
    fail=1
  fi
}

# Subscription code must not import the trip-money rail.
check "entitlement/ imports Razorpay or UPI" \
  "apps/mobile/src/entitlement" \
  "razorpay|upi://|openUpiPayment|RazorpayClient"

# Trip-money code must not import the store IAP SDK.
check "payments/ imports the store IAP SDK" \
  "apps/mobile/src/payments" \
  "react-native-purchases|RevenueCat|Purchases"

check "API billing/ imports Razorpay" \
  "apps/api/src/billing" \
  "razorpay|Razorpay"

check "API payments/ imports RevenueCat" \
  "apps/api/src/payments" \
  "revenuecat|RevenueCat"

if [ "$fail" -ne 0 ]; then
  echo "Rail separation guard FAILED (rahi-docs/09 Part C)."
  exit 1
fi
echo "Rail separation guard passed."
