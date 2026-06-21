import { randomUUID } from 'expo-crypto';

import {
  SeenCache,
  handleIncoming,
  makeEnvelope,
  type MeshEnvelope,
  type MeshMessageType,
} from '@rahi/shared';

import { applyMeshEnvelope } from './apply';
import { useMesh } from './reachability';
import { BridgefyTransport } from './transports/bridgefy';
import { LoopbackTransport } from './transports/loopback';
import { NativeP2PTransport } from './transports/nativeP2P';
import type { MeshTransport } from './transport';

/**
 * Mesh engine (Tasks 8.1/8.3/8.4). Wires a transport to the pure protocol
 * (dedup + TTL relay) and the apply layer (CRDT merge into local SQLite, which
 * reconciles to cloud automatically). Tracks honest reachability + delivery.
 *
 * Spike-gated: `selectTransport` prefers a real transport only when it's
 * `available` (post Spike-M); otherwise mesh stays off and the app runs
 * online-first (rahi-docs/05 §7, /06 §4). Nothing else depends on mesh.
 */
export function selectTransport(allowLoopback = false): MeshTransport {
  const bridgefy = new BridgefyTransport();
  if (bridgefy.available) return bridgefy;
  const native = new NativeP2PTransport();
  if (native.available) return native;
  // Loopback is for dev/sim only — never a shipping fallback.
  if (allowLoopback) return new LoopbackTransport();
  return bridgefy; // inert; start() will throw and the engine reports mesh off
}

export class MeshEngine {
  private readonly seen = new SeenCache();
  private started = false;

  constructor(
    private readonly transport: MeshTransport,
    private readonly groupId: string,
    private readonly selfId: string,
  ) {}

  async start(): Promise<boolean> {
    const mesh = useMesh.getState();
    try {
      await this.transport.start(this.groupId, this.selfId, {
        onMessage: (env, from) => void this.onMessage(env, from),
        onPeerFound: (p) => mesh.peerSeen(p.peerId),
        onPeerLost: (id) => mesh.peerLost(id),
      });
      mesh.setEnabled(true);
      this.started = true;
      return true;
    } catch {
      mesh.setEnabled(false); // transport unavailable → online-first
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    await this.transport.stop();
    useMesh.getState().setEnabled(false);
    this.started = false;
  }

  private async onMessage(env: MeshEnvelope, fromPeerId: string): Promise<void> {
    const mesh = useMesh.getState();
    mesh.peerSeen(fromPeerId);

    const action = handleIncoming(env, this.seen);
    if (action.process) {
      if (env.type === 'ack') {
        const ackedId = (env.payload as { msg_id?: string }).msg_id;
        if (ackedId) mesh.markDelivered(ackedId);
      } else {
        await applyMeshEnvelope(env);
        // Acknowledge non-ack messages so the sender sees "delivered".
        if (env.sender_id !== this.selfId) {
          await this.send('ack', { msg_id: env.msg_id }, 1);
        }
      }
    }
    if (action.relay) await this.transport.broadcast(action.relay);
  }

  /** Broadcast a mutation onto the mesh; marks it `sent` for the UX. */
  async send(type: MeshMessageType, payload: unknown, ttlHops?: number): Promise<string> {
    const msgId = randomUUID();
    const env = makeEnvelope({
      msgId,
      groupId: this.groupId,
      senderId: this.selfId,
      type,
      payload,
      ttlHops,
    });
    this.seen.markSeen(msgId); // never reprocess our own message
    if (type !== 'ack') useMesh.getState().markSent(msgId);
    await this.transport.broadcast(env);
    return msgId;
  }
}
