# Phase 8 — Mesh Networking — exit-gate checklist

Tracks Phase 8 (`../rahi-docs/_build-tasks/phase-8.md`, gates in `../rahi-docs/02`). Reference: `../rahi-docs/06`.

> ⚠️ **Spike-M gate.** Per rahi-docs/06 §4, mesh must not ship until a real
> **3-device cross-platform multi-hop dead-zone test** passes on the chosen
> transport. That needs physical iOS+Android devices and can't be run from here.
> This phase delivers the **complete, transport-agnostic architecture** wired and
> tested at the logic level, with the real transports behind `available=false`
> adapters until the spike passes. Nothing else in the app depends on mesh
> (rahi-docs/05 §7), so this is additive and safe.

## Tasks

- [x] **8.1 Transport integration** — one `MeshTransport` interface (`mesh/transport.ts`) with three adapters: `BridgefyTransport` (Option A, `available=false` pending SDK+license), `NativeP2PTransport` (Option B Multipeer/Nearby, `available=false` pending native module), and `LoopbackTransport` (dev/sim). `selectTransport()` prefers a real transport only when available, else mesh stays off (online-first).
- [x] **8.2 Message protocol** — shared pure `mesh/protocol.ts`: envelope (`msg_id` v7, group_id, type, ttl_hops…), types (position/chat/expense_delta/presence/ack), `SeenCache` LRU dedup, `shouldRelay`/`forwarded`/`handleIncoming`. Group-key encryption seam (`mesh/crypto.ts`; Bridgefy passthrough, native libsodium-derived). **Tested incl. a multi-hop flood simulation.**
- [x] **8.3 Apply via shared merge + reconcile** — `mesh/apply.ts` routes mesh-delivered mutations through the SAME paths: expense_delta via `mergeExpensePair` CRDT, chat/position append-only, all into the durable PowerSync queue → **cloud reconciliation is automatic** on reconnect (rahi-docs/06 §6). `group_messages` table (migration `0006`) + chat repo (idempotent on UUID).
- [x] **8.4 Convoy UX (honest reachability)** — `mesh/reachability.ts` store: in-range/out-of-range + last-seen per peer, `sent` vs `delivered (acked)` per message, tunable beacon seconds. Convoy tab shows an honest mesh status bar; engine sends acks so delivery is real, not assumed.

## Exit gates (from `02`)

| Gate | Status | Where |
|---|---|---|
| 3 mixed-OS devices discover + relay offline | ⏳ **Spike-M** (device) | adapters + `engine.ts` |
| Messages dedup, relay once, honour ttl; non-members can't decrypt | ✅ logic (dedup/ttl tested) / ⏳ encryption on device | `protocol.ts` + sim tests, `crypto.ts` |
| **3-device dead-zone test**: position + chat + bill update propagate offline, reconcile on reconnect | ✅ **simulated** (multi-hop flood + CRDT) / ⏳ device | `protocol.spec.ts` flood sim, `apply.ts` |
| UX never implies delivery/coverage that didn't happen | ✅ | `reachability.ts`, convoy mesh bar (sent vs delivered) |

## Verified here (sandbox, mocked)

- `@rahi/shared` typecheck **passes**; **95 unit tests pass** (added envelope validation, dedup LRU eviction, TTL relay, and a 3-node multi-hop flood simulation proving relay-once + TTL-bounding + no-loop convergence — the device-free stand-in for the dead-zone test).
- Migration `0006` well-formed; all 13 new/changed mesh files parse clean; group bucket syncs `group_messages`.
- Fixed a latent Phase-7 bug: `convoy_positions`/`regroup_points` were defined but not registered in `AppSchema` — now registered alongside `group_messages`.

## Deferred — Spike-M (real devices, before shipping mesh)

1. Choose transport: integrate Bridgefy (resolve commercial licensing) **or** build the native Multipeer+Nearby module; flip its `available` to true.
2. Run the 3-device cross-platform multi-hop test (rahi-docs/06 §4) + 30-min battery sanity.
3. Native encryption: libsodium group key derived from the invite code.
4. If the spike fails → mesh drops to V2; convoy/chat/split stay online-first (no rework — same tables/merge).
