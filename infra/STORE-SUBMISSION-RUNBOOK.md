# Store Submission Runbook (Phase 11)

The release gauntlet for both stores, **including subscription review**. Work top
to bottom; nothing here is code — it's store config, declarations, and the closed
test. Reference: rahi-docs/11, /10, /14. // verify each item against current store
UIs at submission time.

## 0. Pre-flight (engineering)

- [ ] CI green on `main` (typecheck + lint + tests incl. sync convergence + rail guard).
- [ ] No release-blocking Sentry issues open.
- [ ] `expo prebuild` clean; EAS production build profiles set.
- [ ] Version + build numbers bumped (`app.json`).
- [ ] Adaptive sampling on (battery); trip-mode power indicator visible.

## 1. Privacy declarations (Task 11.2)

### Apple App Privacy (App Store Connect → App Privacy)
Declare what we actually collect (match `PRIVACY-POLICY.md`):
- **Location** — precise, **including background** (track recording, convoy, SOS). Linked to user; app functionality.
- **Contacts** — emergency contacts the user adds (on-device; sent only during SOS).
- **Identifiers** — user id (auth), RevenueCat customer id.
- **Diagnostics** — crash/perf (Sentry, PII-scrubbed).
- **Financial info** — NOT collected by us (trip money is UPI/Razorpay hand-off; we never custody funds).

### Google Data Safety (Play Console → Data safety)
- Location (background) — purpose: app functionality; shared with no one for ads.
- Personal info (phone number for auth/OTP).
- Photos (vault) — encrypted, user-initiated.
- Crash logs / diagnostics.
- Encryption in transit: yes. Deletion: account deletion available in-app (see §3).

### Privacy policy URL
- [ ] Publish `PRIVACY-POLICY.md` at `https://rahi.in/privacy` (DPDP, location incl. background, vault, UGC, **best-effort** safety — no guaranteed delivery).

## 2. Background location declaration (Task 11.4)

- **Google Play** → Background Location Declaration form + a short **demo video** showing the in-app feature that needs background location (track recording / convoy) and the prominent in-app disclosure + runtime prompt.
- **Apple** → "Always" location justification in review notes; ensure `Info.plist` strings are specific (already set in `app.json`: `locationAlwaysAndWhenInUsePermission`, etc.).
- [ ] Every permission string is specific + honest; no "guaranteed emergency" claims anywhere.

## 3. Subscription review compliance (Task 11.3, rahi-docs/11 §2b)

- [ ] Subscription sold **only** via Apple IAP / Play Billing (enforced by `assertRail` + `scripts/check-rails.sh`).
- [ ] Paywall discloses **price, period, free-trial length, auto-renew, and how to cancel** (Paywall.tsx disclosure block).
- [ ] **Restore purchases** works (Paywall → Restore).
- [ ] **Manage subscription** deep links present (App Store / Play) — Paywall links.
- [ ] **Functional free tier** — online use works without subscribing.
- [ ] **Account deletion** in-app for subscribers — `DELETE /account` (settings screen).
- [ ] Apple **Small Business Program** enrolled (15%).
- [ ] Subscription products + 7-day trial live in both stores (see `STORE-SETUP.md`).

## 4. UGC + safety (Task 11.4)

- [ ] Hazard reports: report/flag + **auto-hide** past threshold + admin review queue (`/admin/moderation`).
- [ ] Block user + an EULA with a **zero-tolerance for objectionable content** clause (`EULA.md`) — required by Apple for UGC apps.
- [ ] In-app safety copy says **best-effort**, never guarantees SOS delivery (rahi-docs/10/11).

## 5. Closed testing + submit (Task 11.5)

- [ ] **Google**: run the **closed test with 12+ testers for 14 days** (required for new personal Play accounts) before production.
- [ ] Fix release-blocking issues surfaced in test.
- [ ] Submit to **App Store** + **Play** (production).
- [ ] Respond to review notes; resubmit as needed.

**Exit: both stores approved (incl. subscription review).**
