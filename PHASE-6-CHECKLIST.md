# Phase 6 — Core Safety — exit-gate checklist

Tracks Phase 6 (`../rahi-docs/_build-tasks/phase-6.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/10`, `../rahi-docs/11`, `../rahi-docs/14`.
✅ = built + verified (mocked). ⏳ = needs a device / ride test.

## Tasks

- [x] **6.1 Learned mileage + fuel-range** — shared `learnKmpl`/`fuelRangeWarning` (full-tank method, reserve margin) + mobile `safety/fuel.ts` (reads `fuel_logs` + bike baseline + nearest cached fuel POI). Offline.
- [x] **6.2 Daylight warning** — shared offline sunset math (`sunsetUtc`/`minutesUntilSunset`/`daylightWarning`, SunCalc-style) + mobile `safety/daylight.ts` at current coords. Validated: Bengaluru 2026-06-21 sunset = 18:49 IST (actual ~18:48).
- [x] **6.3 SOS pipeline (platform-aware)** — shared `composeSosMessage`/`deliveryPlan`/`isCrashSignature`; mobile `sensors/crashDetector.ts` (expo-sensors → shared detector), `safety/sos.ts` (expo-sms pre-composed both platforms, queued cloud `sos_events`, 112 handoff). **No silent auto-send; no guaranteed-delivery claims** (rahi-docs/10/11). Cancellable countdown in the UI.
- [x] **6.4 Beacon + dead-man's-switch** — shared `deadman` timing (isCheckInDue/shouldEscalate) + mobile `safety/beacon.ts` (periodic fix) and `safety/deadman.ts` (prompt → escalate on timeout).
- [x] **6.5 Free/Pro safety split** — `safety/gate.ts`: **manual SOS is always Free** (no paywall in an emergency); crash-detect, fuel-range, daylight, beacon, deadman gated `pro`. Enforced in the Safety tab.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Range warning fires correctly offline from learned mileage | ✅ logic | `fuel.ts` + shared (tested) |
| Daylight warning accurate offline | ✅ logic | `daylight.ts` + shared (tested, sunset validated) |
| Crash detection triggers flow; per-platform delivery; no false positives | ✅ logic / ⏳ ride test | `crashDetector.ts`, `sos.ts`, `isCrashSignature` (pothole/normal-riding tests) |
| Beacon sends per platform; deadman escalates on no-response | ✅ logic / ⏳ device | `beacon.ts`, `deadman.ts` + shared (tested) |
| Free floor works without subscription; advanced gated | ✅ | `gate.ts`, Safety tab |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **81 unit tests pass** (added fuel, daylight/sunset, crash signature incl. pothole/normal-riding negatives, SOS compose + delivery policy, deadman).
- All 10 new Phase 6 mobile files parse clean; rail guard still passes.

## Deferred (needs device / ride test)

- On-device accelerometer crash test (no false positives over a real ride), per-platform SMS/Emergency-SOS behaviour, background beacon — on a dev-client build.
- iOS SMS limitation surfaced honestly (pre-composed, user taps send).
