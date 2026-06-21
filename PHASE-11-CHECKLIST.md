# Phase 11 — Hardening & Store Submission — exit-gate checklist

Tracks Phase 11 (`../rahi-docs/_build-tasks/phase-11.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/10`, `../rahi-docs/11`, `../rahi-docs/14`.
Mostly release-readiness (config/declarations/closed test), so several items are ⏳ until real accounts/builds exist.

## Tasks

- [x] **11.1 Performance & battery** — shared `power/sampling.ts` (`adaptiveSamplingSeconds`, `powerMode`): adapt location/sensor cadence to speed + battery; trip-mode indicator. **Tested.** ⏳ real-device battery profiling.
- [x] **11.2 Privacy declarations** — `PRIVACY-POLICY.md` (DPDP, background location, vault, UGC, best-effort safety) + Apple App Privacy / Google Data Safety mapping in `infra/STORE-SUBMISSION-RUNBOOK.md`. ⏳ publish URL + fill store forms.
- [x] **11.3 Subscription review compliance** — paywall discloses **price/period/trial/auto-renew/cancel** + **Restore** + **Manage subscription** deep links; **account deletion** endpoint `DELETE /account` (DPDP + store requirement); functional free tier; rail guard enforces IAP-only. Checklist in the runbook.
- [x] **11.4 UGC + background-location + permissions** — hazard report/flag + auto-hide + admin queue (Phase 9); `EULA.md` with zero-tolerance UGC clause + block; honest permission strings (`app.json`); background-location declaration steps in the runbook; no guaranteed-delivery claims. ⏳ submit Google declaration + video.
- [x] **11.5 Closed testing + submit** — `infra/STORE-SUBMISSION-RUNBOOK.md` runbook (Google 12-tester/14-day closed test, fix release-blocking Sentry, submit both stores). CI release gate green (typecheck/lint/test/rail-guard). ⏳ actual closed test + submissions.

## Also in this change

- **OTP provider switch** — `OTP_PROVIDER` env (`msg91` | `twilio`); `OtpService` selects at runtime; `TwilioService` (Verify API) + `Msg91Service` both implement `SmsOtpProvider`. Switch with one env var, no code change.
- **CI fix** — removed the duplicate pnpm version (uses `packageManager`), bumped Node 20 → **24**.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Battery acceptable in trip mode; no track-tick jank | ✅ adaptive logic / ⏳ device | `power/sampling.ts` |
| Privacy declarations match behaviour; policy live | ✅ drafted / ⏳ publish+forms | `PRIVACY-POLICY.md`, runbook |
| All subscription-review items pass | ✅ in-app parts / ⏳ store review | Paywall, `DELETE /account`, runbook |
| UGC controls live; declarations submitted; strings honest | ✅ controls + EULA / ⏳ submit | `EULA.md`, hazards, `app.json` |
| **Both stores approved** | ⏳ submission | runbook §5 |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **116 unit tests pass** (added adaptive sampling + power mode).
- OTP switch + account deletion + paywall disclosures parse clean; rail guard holds; `ci.yml` valid (Node 24, single pnpm version).

## Deferred (needs accounts / real devices)

- On-device battery profiling; publishing the privacy policy + filling Apple/Google privacy forms; the Google background-location declaration + video; the 12-tester closed test; and the actual store submissions + review.
