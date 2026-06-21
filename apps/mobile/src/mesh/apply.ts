import {
  mergeExpensePair,
  type MeshEnvelope,
  type MergeableExpense,
} from '@rahi/shared';

import { chatRepository } from '../features/chat/chat.repository';
import { convoyRepository } from '../features/convoy/convoy.repository';
import { db } from '../db/powersync';
import { SYNC_TABLES } from '@rahi/shared';

/**
 * Apply a mesh-delivered mutation to local SQLite through the SAME paths a normal
 * write uses (Task 8.3, rahi-docs/06 §5-6). Because these writes land in the
 * durable PowerSync queue, **cloud reconciliation is automatic**: when any node
 * reaches signal, its queue (its own + mesh-received mutations) flushes to
 * Postgres and the whole group converges — CRDT merge for expenses, append-only
 * for chat/positions, idempotent on row UUID regardless of arrival path.
 *
 * Mesh is just another delivery channel — no separate conflict model.
 */
interface PositionPayload {
  group_id: string;
  member_id: string;
  lng: number;
  lat: number;
}
interface ChatPayload {
  id: string;
  group_id: string;
  sender_member_id: string;
  body: string;
  created_at: string;
}

export async function applyMeshEnvelope(env: MeshEnvelope): Promise<void> {
  switch (env.type) {
    case 'position': {
      const p = env.payload as PositionPayload;
      await convoyRepository.broadcastPosition(p.group_id, p.member_id, p.lng, p.lat);
      return;
    }
    case 'chat': {
      const c = env.payload as ChatPayload;
      await chatRepository.upsertById(c);
      return;
    }
    case 'expense_delta': {
      await applyExpenseDelta(env.payload as MergeableExpense & Record<string, unknown>);
      return;
    }
    case 'presence':
    case 'ack':
      // Presence/ack affect transient reachability/delivery state, handled by the
      // engine, not persisted here.
      return;
    default:
      return;
  }
}

/**
 * Merge a mesh-delivered expense into the local ledger using the SAME CRDT
 * reducer the sync layer uses, then persist the winner. Idempotent and
 * order-independent (rahi-docs/05 §4).
 */
async function applyExpenseDelta(incoming: MergeableExpense & Record<string, unknown>): Promise<void> {
  const existingRows = await db.getAll<MergeableExpense & Record<string, unknown>>(
    `SELECT * FROM ${SYNC_TABLES.expenses} WHERE id = ? LIMIT 1`,
    [incoming.id],
  );
  const existing = existingRows[0];
  const winner = existing ? mergeExpensePair(existing, incoming) : incoming;

  const cols = Object.keys(winner);
  const placeholders = cols.map(() => '?').join(', ');
  const updates = cols.map((c) => `${c} = excluded.${c}`).join(', ');
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO ${SYNC_TABLES.expenses} (${cols.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}`,
      cols.map((c) => winner[c as keyof typeof winner] as unknown),
    );
  });
}
