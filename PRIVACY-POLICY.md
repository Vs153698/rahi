# Rahi — Privacy Policy (draft)

> Draft for store submission (Phase 11). Publish at `https://rahi.in/privacy` and
> have it reviewed by a professional before launch. Tuned for India's **DPDP Act**.
> Last updated: 2026-06-21.

## Who we are
Rahi (codename) is an offline-first companion app for motorcycle riders in India.
Data is stored in the **Mumbai (ap-south-1)** region.

## What we collect and why
- **Phone number** — to sign you in via OTP. Sent to our SMS provider (MSG91 or
  Twilio) only to deliver the code.
- **Location (precise, including in the background)** — to record your ride track,
  show your position on the convoy map, power safety features, and (with consent)
  contribute anonymisable coverage samples. Background location is essential to
  track a ride while your screen is off.
- **Emergency contacts** — names/numbers you add. Stored on your device; sent
  **only** when you trigger SOS.
- **Documents (vault)** — encrypted on your device before upload; we cannot read
  them.
- **Trip expenses** — amounts and splits you enter. Settlement is a UPI hand-off;
  **we never hold or route your money.**
- **Subscription status** — via RevenueCat + the stores, to unlock Pro.
- **Diagnostics** — crash/performance data via Sentry, with personal data scrubbed.

## What we do NOT do
- We do not sell your data or use it for advertising.
- We do not custody funds (trip money moves bank-to-bank over UPI/Razorpay).
- We do not guarantee delivery of SOS/safety messages — they are **best-effort**.

## Sharing
Service providers only, to run the app: Supabase (database, Mumbai), PowerSync
(sync), MSG91/Twilio (OTP), RevenueCat + Apple/Google (subscriptions), Razorpay
(pool pay-in), Cloudflare R2 (encrypted storage), Sentry (diagnostics).

## Your rights (DPDP)
Access, correction, and **deletion**. You can delete your account in-app
(Settings → Delete account), which removes your data; store subscriptions must be
cancelled separately in your store account.

## Consent
Coverage-sample contribution is opt-in. Location and notification permissions are
requested with clear in-app disclosures before the OS prompt.

## Contact
privacy@rahi.in (placeholder).
