import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES } from '@rahi/shared';

import { BaseRepository } from './base.repository';

export interface LocalTrip {
  id: string;
  owner_id: string;
  title: string;
  status: string;
  updated_at: string;
}

/**
 * On-device trips repository. Writes go through the durable PowerSync queue
 * (BaseRepository.write). Conflict strategy: LWW on scalar fields by updated_at
 * (rahi-docs/05 §3) — applied server-side; the device just records intent.
 */
class TripsRepository extends BaseRepository {
  watchForUser(ownerId: string, onChange: (rows: LocalTrip[]) => void): () => void {
    const controller = new AbortController();
    void this.db.watch(
      `SELECT * FROM ${SYNC_TABLES.trips} WHERE owner_id = ? AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [ownerId],
      { onResult: (r) => onChange((r.rows?._array ?? []) as LocalTrip[]) },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }

  async create(ownerId: string, title: string): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.trips}
           (id, owner_id, title, status, client_updated_at, updated_at)
         VALUES (?, ?, ?, 'planned', ?, ?)`,
        [id, ownerId, title, now, now],
      ),
    );
    return id;
  }

  async rename(id: string, title: string): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `UPDATE ${SYNC_TABLES.trips} SET title = ?, client_updated_at = ?, updated_at = ? WHERE id = ?`,
        [title, now, now, id],
      ),
    );
  }
}

export const tripsRepository = new TripsRepository();
