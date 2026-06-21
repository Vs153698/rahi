# Phase 0 — Mobile smoke (manual)

Run on a **real device** with a dev-client build (`expo prebuild` → EAS/local build),
because native modules (PowerSync SQLite, secure-store) aren't in Expo Go.

A scripted Detox/Maestro flow replaces this in Phase 6 (CI e2e). For Phase 0 this
manual pass demonstrates the exit gates in `../../rahi-docs/02-build-plan.md`.

## Steps

1. **Offline cold launch** — enable airplane mode, force-quit, reopen.
   - ✅ App launches to a usable screen with no network spinner blocking it.
   - First run (no session) → lands on the OTP login screen (expected; login needs network once).

2. **OTP login (online, once)** — disable airplane mode.
   - Enter a `+91` number → **Send OTP** → enter the 6-digit code → **Verify**.
   - ✅ Lands on the Home tab. (Requires Supabase + MSG91 provisioned — // verify.)

3. **Session persists across kill/reopen offline** — enable airplane mode, force-quit, reopen.
   - ✅ App opens straight to Home (no login wall). Session was read from the keychain.

4. **Trivial entity round-trips** — while offline, add a note on Home.
   - ✅ It appears immediately (local SQLite).
   - Re-enable network → ✅ the row appears in Supabase `public.notes`; the list re-renders on sync.

5. **Entitlement hook reads** — open the **Pro** tab.
   - ✅ Shows the locked Phase-0 state (stub resolves `active: false`), with no crash, offline.

## Pass criteria

All five ✅ — matches Phase 0 exit gates. Record the device/OS and build id in the PR.
