# Sync test harness (device level)

The **merge-logic** half of rahi-docs/05 §8 runs in CI today as pure unit tests in
`packages/shared/src/merge/convergence.spec.ts` (commutativity, idempotence,
associativity, long-offline union, clock-skew). Those gate every PR.

This directory holds the **device-level** half, which needs a real dev-client
build + PowerSync/Supabase and therefore runs on-device (Detox or Maestro), not
in the pure-node CI job. They are wired into the release pipeline from Phase 6
(when the e2e runner lands), and are **release blockers** — a sync regression
must fail them.

## The four scenarios (rahi-docs/05 §8)

1. **Airplane-mode fuzz** — script toggles connectivity mid-write across many
   iterations; assert no lost or duplicated rows in Postgres after settle.
2. **Two-device convergence** — two simulators edit the same trip's expenses
   offline, then reconnect; assert identical final ledger on both + in Postgres.
   (The pure version of this invariant is already proven in `convergence.spec.ts`.)
3. **Long-offline flush** — queue 500+ mutations across a kill/reopen; assert the
   durable PowerSync upload queue flushes completely and in order.
4. **Clock skew** — devices with skewed clocks; assert merge tiebreaks
   (version → stable id, never raw wall-clock alone) still converge.

## Status

- [x] Merge-level invariants (CI, pure) — `packages/shared/src/merge/convergence.spec.ts`
- [ ] Device harness (Detox/Maestro) — scaffolded in Phase 6 with the e2e runner
      (`../../../rahi-docs/02` Phase 6). Until then, run scenario 2's logic via the
      shared convergence tests and validate transport manually on a dev build.
