import { z } from 'zod';

/**
 * Mesh message protocol (Task 8.2, rahi-docs/06 §5). Pure + transport-agnostic so
 * it can be unit-tested without devices and reused by any transport (Bridgefy or
 * native). The payloads are the SAME mutations the sync layer uses — mesh is just
 * another delivery channel, no separate conflict model (rahi-docs/06 §5).
 */
export type MeshMessageType = 'position' | 'chat' | 'expense_delta' | 'presence' | 'ack';

export const MeshEnvelopeSchema = z.object({
  msg_id: z.string().uuid(),
  group_id: z.string().uuid(),
  sender_id: z.string(),
  type: z.enum(['position', 'chat', 'expense_delta', 'presence', 'ack']),
  ts: z.string().datetime(),
  client_updated_at: z.string().datetime().optional(),
  /** Opaque payload (encrypted on the wire for native transport). */
  payload: z.unknown(),
  /** Remaining relay hops; decremented on each forward, dropped at 0. */
  ttl_hops: z.number().int().min(0).max(16),
});
export type MeshEnvelope = z.infer<typeof MeshEnvelopeSchema>;

export const DEFAULT_TTL_HOPS = 5;

export function makeEnvelope(params: {
  msgId: string;
  groupId: string;
  senderId: string;
  type: MeshMessageType;
  payload: unknown;
  ttlHops?: number;
  now?: Date;
}): MeshEnvelope {
  return {
    msg_id: params.msgId,
    group_id: params.groupId,
    sender_id: params.senderId,
    type: params.type,
    ts: (params.now ?? new Date()).toISOString(),
    payload: params.payload,
    ttl_hops: params.ttlHops ?? DEFAULT_TTL_HOPS,
  };
}

export function isValidEnvelope(value: unknown): value is MeshEnvelope {
  return MeshEnvelopeSchema.safeParse(value).success;
}

/**
 * Bounded LRU of seen msg_ids for dedup (rahi-docs/06 §5). `markSeen` returns
 * false the first time an id is seen (process it) and true on repeats (drop it).
 */
export class SeenCache {
  private readonly ids = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly capacity = 2048) {}

  /** Returns true if already seen (a duplicate); records it either way. */
  markSeen(msgId: string): boolean {
    if (this.ids.has(msgId)) return true;
    this.ids.add(msgId);
    this.order.push(msgId);
    if (this.order.length > this.capacity) {
      const evicted = this.order.shift();
      if (evicted !== undefined) this.ids.delete(evicted);
    }
    return false;
  }

  has(msgId: string): boolean {
    return this.ids.has(msgId);
  }

  get size(): number {
    return this.ids.size;
  }
}

/** Whether an envelope may still be relayed (has hops left). */
export function shouldRelay(env: MeshEnvelope): boolean {
  return env.ttl_hops > 0;
}

/** A copy of the envelope with one hop consumed (for forwarding). */
export function forwarded(env: MeshEnvelope): MeshEnvelope {
  return { ...env, ttl_hops: Math.max(0, env.ttl_hops - 1) };
}

/**
 * Decide what a node should do with a received envelope: process it (if new),
 * and relay it (if new and hops remain). Pure — the engine performs the effects.
 */
export interface MeshAction {
  process: boolean;
  relay: MeshEnvelope | null;
}

export function handleIncoming(env: MeshEnvelope, seen: SeenCache): MeshAction {
  const duplicate = seen.markSeen(env.msg_id);
  if (duplicate) return { process: false, relay: null };
  return { process: true, relay: shouldRelay(env) ? forwarded(env) : null };
}
