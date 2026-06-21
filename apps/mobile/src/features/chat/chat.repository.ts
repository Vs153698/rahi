import { SYNC_TABLES } from '@rahi/shared';

import { BaseRepository } from '../../db/repositories/base.repository';

/**
 * Group chat (Phase 8). Append-only and immutable (rahi-docs/05 §3) — a message
 * is one row keyed by UUID, so a line that arrives via mesh AND via cloud is the
 * same row (idempotent). Writes ride the durable queue and reconcile on
 * reconnect. `upsertById` is used by the mesh apply path to insert a message
 * authored on another device with its original id.
 */
export interface ChatMessage {
  id: string;
  group_id: string;
  sender_member_id: string;
  body: string;
  created_at: string;
}

class ChatRepository extends BaseRepository {
  /** Insert a message keyed by its id; ignore if already present (idempotent). */
  async upsertById(msg: ChatMessage): Promise<void> {
    const existing = await this.db.getAll<{ id: string }>(
      `SELECT id FROM ${SYNC_TABLES.group_messages} WHERE id = ? LIMIT 1`,
      [msg.id],
    );
    if (existing[0]) return;
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.group_messages}
           (id, group_id, sender_member_id, body, created_at, client_updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [msg.id, msg.group_id, msg.sender_member_id, msg.body, msg.created_at, msg.created_at],
      ),
    );
  }

  watch(groupId: string, onChange: (rows: ChatMessage[]) => void): () => void {
    const controller = new AbortController();
    void this.db.watch(
      `SELECT id, group_id, sender_member_id, body, created_at FROM ${SYNC_TABLES.group_messages}
       WHERE group_id = ? ORDER BY created_at ASC`,
      [groupId],
      { onResult: (r) => onChange((r.rows?._array ?? []) as ChatMessage[]) },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }
}

export const chatRepository = new ChatRepository();
