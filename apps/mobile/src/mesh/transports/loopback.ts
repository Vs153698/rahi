import type { MeshEnvelope } from '@rahi/shared';

import type { MeshPeer, MeshTransport, MeshTransportEvents } from '../transport';

/**
 * In-process loopback transport. Used in dev and the deterministic mesh
 * simulation — multiple LoopbackTransport instances share a static bus, so a
 * "broadcast" is delivered to every other started instance. Lets us exercise the
 * full engine (envelope → relay → apply) without devices.
 */
const BUS = new Set<LoopbackTransport>();

export class LoopbackTransport implements MeshTransport {
  readonly name = 'loopback' as const;
  readonly available = true;
  private events: MeshTransportEvents | null = null;
  private selfId = '';
  private groupId = '';

  async start(groupId: string, selfId: string, events: MeshTransportEvents): Promise<void> {
    this.groupId = groupId;
    this.selfId = selfId;
    this.events = events;
    BUS.add(this);
    for (const other of BUS) {
      if (other !== this && other.groupId === groupId) {
        events.onPeerFound({ peerId: other.selfId });
        other.events?.onPeerFound({ peerId: this.selfId });
      }
    }
  }

  async stop(): Promise<void> {
    BUS.delete(this);
    for (const other of BUS) other.events?.onPeerLost(this.selfId);
    this.events = null;
  }

  async broadcast(env: MeshEnvelope): Promise<number> {
    let sent = 0;
    for (const other of BUS) {
      if (other !== this && other.groupId === this.groupId) {
        other.events?.onMessage(env, this.selfId);
        sent++;
      }
    }
    return sent;
  }

  peers(): MeshPeer[] {
    return [...BUS]
      .filter((t) => t !== this && t.groupId === this.groupId)
      .map((t) => ({ peerId: t.selfId }));
  }
}
