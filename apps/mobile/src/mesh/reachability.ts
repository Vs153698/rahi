import { create } from 'zustand';

/**
 * Honest reachability + delivery state (Task 8.4, rahi-docs/06 §7). Mesh range is
 * short; the UX must show who is ACTUALLY in range now, last-seen for those who
 * aren't, and `sent` vs `delivered (acked)` per message — never implying delivery
 * or coverage that didn't happen.
 */
export type Reachability = 'in_range' | 'out_of_range';
export type DeliveryState = 'sent' | 'delivered';

export interface PeerStatus {
  reachability: Reachability;
  lastSeenMs: number;
}

interface MeshState {
  enabled: boolean;
  /** peerId → status. */
  peers: Record<string, PeerStatus>;
  /** msg_id → delivery state for messages we sent. */
  delivery: Record<string, DeliveryState>;
  /** Position-beacon frequency (Hz-ish; user-tunable to save battery). */
  beaconSeconds: number;

  setEnabled: (enabled: boolean) => void;
  peerSeen: (peerId: string) => void;
  peerLost: (peerId: string) => void;
  markSent: (msgId: string) => void;
  markDelivered: (msgId: string) => void;
  setBeaconSeconds: (s: number) => void;
  reset: () => void;
}

export const useMesh = create<MeshState>((set) => ({
  enabled: false,
  peers: {},
  delivery: {},
  beaconSeconds: 15,

  setEnabled: (enabled) => set({ enabled }),
  peerSeen: (peerId) =>
    set((s) => ({
      peers: { ...s.peers, [peerId]: { reachability: 'in_range', lastSeenMs: Date.now() } },
    })),
  peerLost: (peerId) =>
    set((s) => {
      const prev = s.peers[peerId];
      return {
        peers: {
          ...s.peers,
          [peerId]: { reachability: 'out_of_range', lastSeenMs: prev?.lastSeenMs ?? Date.now() },
        },
      };
    }),
  markSent: (msgId) => set((s) => ({ delivery: { ...s.delivery, [msgId]: 'sent' } })),
  markDelivered: (msgId) => set((s) => ({ delivery: { ...s.delivery, [msgId]: 'delivered' } })),
  setBeaconSeconds: (beaconSeconds) => set({ beaconSeconds }),
  reset: () => set({ peers: {}, delivery: {} }),
}));

/** Human last-seen label for the convoy panel. */
export function lastSeenLabel(status: PeerStatus | undefined, now = Date.now()): string {
  if (!status) return 'never';
  if (status.reachability === 'in_range') return 'in range';
  const mins = Math.round((now - status.lastSeenMs) / 60000);
  return mins <= 0 ? 'just now' : `last seen ${mins}m ago`;
}
