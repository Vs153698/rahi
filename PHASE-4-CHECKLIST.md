# Phase 4 — Bill Splitting & Kitty — exit-gate checklist

Tracks Phase 4 (`../rahi-docs/_build-tasks/phase-4.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/04 §4`, `../rahi-docs/05 §4`.
✅ = built + verified (mocked). ⏳ = needs a device / two-device run.

## Tasks

- [x] **4.1 Expense ledger (CRDT)** — feature read layer (`features/expenses/expenses.feature.ts`) over the Phase-1 CRDT-merged `expenses`/`expense_shares`; writes via `db/repositories/expenses.repository.ts` (adds union, edits bump `merge_version`, soft-delete, shares recomputed). Convergence already proven (`packages/shared/src/merge/convergence.spec.ts`).
- [x] **4.2 Split types** — `features/expenses/splits.ts`: equal / custom / **by-distance (from the track log)** / per-bike, all via shared `recomputeShares` (paise-exact, deterministic). by-distance weights come from each member's recorded track via shared `pathLengthMeters`.
- [x] **4.3 Kitty** — `features/kitty/kitty.repository.ts`: append-only `kitty_contributions` with a **derived** balance (`deriveKittyBalance`), never an edited number — conflict-free under offline merge. Writes through the durable queue.
- [x] **4.4 Free/Pro gating** — `features/expenses/gate.ts`: online splitting is **Free**, offline splitting gated **`pro`** (`OfflineSplitRequiresProError`). Wired into the **Split** tab; paywall message on Free+offline.

## New shared, testable logic

- `money/balances.ts` — `computeBalances` (payer owed − shares owed, confirmed settlements discharge debt, deleted expenses ignored, sums to zero) + `suggestSettlements` (greedy minimal transfers). Pure → identical on every device.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| Split online (Free) and offline (Pro); reconciles correctly | ✅ code / ⏳ device | `gate.ts`, `expenses.repository.ts`, merge reducer |
| Two devices editing same trip offline converge to identical ledger | ✅ proven (pure) / ⏳ device | `convergence.spec.ts` |
| Fair fuel split from track distance works | ✅ | `splits.ts` (by-distance) + `recomputeShares` tests |
| Balances consistent after conflicting offline edits | ✅ | `computeBalances` over merged ledger |
| Kitty balance = sum(contributions) − draws; conflict-free | ✅ | `kitty.repository.ts`, `deriveKittyBalance` |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **60 unit tests pass** (added 4 balance/settlement tests).
- All 6 new/changed Phase 4 files parse clean.

## Deferred (needs device / later phases)

- Group membership UI (groups land in Phase 7) — the Split screen reads the active trip's group/members from synced tables.
- Two-simulator offline convergence on a dev-client build (merge-level convergence already gated in CI).
