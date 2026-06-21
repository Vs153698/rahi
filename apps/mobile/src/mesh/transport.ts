import type { MeshEnvelope } from '@rahi/shared';

/**
 * The single mesh transport interface (Task 8.1, rahi-docs/06 §3). Every concrete
 * transport — Bridgefy, the native Multipeer/Nearby module, or loopback for
 * tests — implements this, so the rest of the app (engine, apply, UX) is
 * transport-agnostic and the Spike-M decision is swapping one adapter.
 *
 * IMPORTANT: mesh ships only after Spike-M proves cross-platform multi-hop on the
 * chosen transport (rahi-docs/06 §4). Until then these adapters are wired but
 * inert; the app runs online-first and nothing depends on mesh (rahi-docs/05 §7).
 */
export interface MeshPeer {
  /** Stable peer id (maps to a rider/member once handshaked). */
  peerId: string;
  /** Best-effort signal/quality 0..1 if the transport exposes it. */
  quality?: number;
}

export interface MeshTransportEvents {
  onMessage: (env: MeshEnvelope, fromPeerId: string) => void;
  onPeerFound: (peer: MeshPeer) => void;
  onPeerLost: (peerId: string) => void;
}

export interface MeshTransport {
  readonly name: 'bridgefy' | 'native-p2p' | 'loopback';
  /** True when this transport is licensed/available on the running build. */
  readonly available: boolean;

  start(groupId: string, selfId: string, events: MeshTransportEvents): Promise<void>;
  stop(): Promise<void>;

  /** Broadcast an envelope to all current peers. Returns peers it was sent to. */
  broadcast(env: MeshEnvelope): Promise<number>;

  /** Currently in-range peers (honest reachability — rahi-docs/06 §7). */
  peers(): MeshPeer[];
}
