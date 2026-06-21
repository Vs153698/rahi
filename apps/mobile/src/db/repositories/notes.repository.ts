import { randomUUID } from 'expo-crypto';

import { type Note } from '@rahi/shared';

import { db } from '../powersync';

// Local-only dev table (Phase 0 demo; not synced). See db/schema.ts.
const NOTES_TABLE = 'notes';

/**
 * Notes repository — the ONLY place that writes the `notes` table (repository
 * pattern, lint rule `no-direct-db-write-outside-repo`). Trivial entity used to
 * prove the Phase 0 offline-create → reconnect → sync round-trip.
 *
 * Conflict strategy: LWW on scalars via `updated_at` (rahi-docs/05).
 */
export const notesRepository = {
  /** Reactive list of the current user's notes, newest first. */
  watchAll(onChange: (rows: Note[]) => void): () => void {
    const controller = new AbortController();
    void db.watch(
      `SELECT * FROM ${NOTES_TABLE} ORDER BY created_at DESC`,
      [],
      { onResult: (result) => onChange((result.rows?._array ?? []) as Note[]) },
      { signal: controller.signal },
    );
    return () => controller.abort();
  },

  /** Create a note locally; PowerSync queues + syncs it when online. */
  async create(ownerId: string, body: string): Promise<void> {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO ${NOTES_TABLE} (id, owner_id, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [randomUUID(), ownerId, body, now, now],
    );
  },
};
