import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, moderationFromFlags, type HazardKind } from '@rahi/shared';

import { BaseRepository } from '../../db/repositories/base.repository';

/**
 * Hazard reports (Task 9.4, rahi-docs/10). Geotagged road conditions shared over
 * cloud AND mesh. `confirmations`/`flag_count` are additive counters that
 * counter-merge (shared `mergeHazard`); visibility is derived from them via the
 * shared `moderationFromFlags` rule — a report auto-hides for review once flags
 * cross the threshold. The optional `broadcast` hook pushes the report onto the
 * mesh so it reaches the group off-grid.
 */
export interface HazardReport {
  id: string;
  reported_by: string;
  trip_id: string | null;
  lng: number;
  lat: number;
  kind: HazardKind;
  note: string | null;
  confirmations: number;
  flag_count: number;
  moderation_status: string;
}

interface Row {
  id: string;
  reported_by: string;
  trip_id: string | null;
  geom: string | null;
  kind: HazardKind;
  note: string | null;
  confirmations: number;
  flag_count: number;
  moderation_status: string;
}

export type MeshBroadcast = (payload: Record<string, unknown>) => void;

class HazardsRepository extends BaseRepository {
  async create(params: {
    reportedBy: string;
    tripId: string | null;
    lng: number;
    lat: number;
    kind: HazardKind;
    note?: string;
    broadcast?: MeshBroadcast;
  }): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.hazard_reports}
           (id, reported_by, trip_id, geom, kind, note, confirmations, flag_count, moderation_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0, 'visible', ?, ?)`,
        [
          id,
          params.reportedBy,
          params.tripId,
          JSON.stringify({ type: 'Point', coordinates: [params.lng, params.lat] }),
          params.kind,
          params.note ?? null,
          now,
          now,
        ],
      ),
    );
    params.broadcast?.({ id, kind: params.kind, lng: params.lng, lat: params.lat, note: params.note });
    return id;
  }

  async confirm(id: string): Promise<void> {
    await this.adjustCounters(id, { confirmations: +1 });
  }

  /** Flag a report; recomputes visibility and auto-hides past the threshold. */
  async flag(id: string): Promise<void> {
    await this.adjustCounters(id, { flagCount: +1 });
  }

  private async adjustCounters(
    id: string,
    delta: { confirmations?: number; flagCount?: number },
  ): Promise<void> {
    const rows = await this.db.getAll<Row>(
      `SELECT confirmations, flag_count FROM ${SYNC_TABLES.hazard_reports} WHERE id = ? LIMIT 1`,
      [id],
    );
    const cur = rows[0];
    if (!cur) return;
    const confirmations = cur.confirmations + (delta.confirmations ?? 0);
    const flagCount = cur.flag_count + (delta.flagCount ?? 0);
    const moderation = moderationFromFlags({ confirmations, flagCount });
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `UPDATE ${SYNC_TABLES.hazard_reports}
           SET confirmations = ?, flag_count = ?, moderation_status = ?, updated_at = ?
         WHERE id = ?`,
        [confirmations, flagCount, moderation, now, id],
      ),
    );
  }

  /** Visible hazards along a trip (auto-hidden ones excluded). */
  watchForTrip(tripId: string, onChange: (rows: HazardReport[]) => void): () => void {
    const controller = new AbortController();
    void this.db.watch(
      `SELECT * FROM ${SYNC_TABLES.hazard_reports}
       WHERE trip_id = ? AND moderation_status = 'visible'`,
      [tripId],
      {
        onResult: (r) => {
          const rows = (r.rows?._array ?? []) as Row[];
          onChange(
            rows.map((row) => {
              const g = row.geom ? (JSON.parse(row.geom) as { coordinates: [number, number] }) : null;
              return {
                id: row.id,
                reported_by: row.reported_by,
                trip_id: row.trip_id,
                lng: g?.coordinates[0] ?? 0,
                lat: g?.coordinates[1] ?? 0,
                kind: row.kind,
                note: row.note,
                confirmations: row.confirmations,
                flag_count: row.flag_count,
                moderation_status: row.moderation_status,
              };
            }),
          );
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }
}

export const hazardsRepository = new HazardsRepository();
