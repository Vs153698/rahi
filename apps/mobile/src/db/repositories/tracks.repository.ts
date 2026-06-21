import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES } from '@rahi/shared';

import { BaseRepository } from './base.repository';

export interface BreadcrumbInput {
  lng: number;
  lat: number;
  altitudeM?: number | null;
  speedKmh?: number | null;
  recordedAt: string; // ISO
}

/**
 * track_points repository. Immutable append-only telemetry (rahi-docs/05 §3) —
 * batched writes through the durable PowerSync queue so a multi-day offline ride
 * flushes in order on reconnect. The server downsamples for the recap.
 */
class TracksRepository extends BaseRepository {
  /** Batch-insert breadcrumbs for a trip in one transaction. */
  async appendBatch(tripId: string, points: BreadcrumbInput[]): Promise<void> {
    if (points.length === 0) return;
    await this.write(async (tx) => {
      for (const p of points) {
        await tx.execute(
          `INSERT INTO ${SYNC_TABLES.track_points}
             (id, trip_id, geom, altitude_m, speed_kmh, recorded_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            randomUUID(),
            tripId,
            // Store as GeoJSON text locally; server casts to geography on sync.
            JSON.stringify({ type: 'Point', coordinates: [p.lng, p.lat] }),
            p.altitudeM ?? null,
            p.speedKmh ?? null,
            p.recordedAt,
          ],
        );
      }
    });
  }

  /** Read a trip's recorded track as an ordered coordinate list (for replay). */
  async getTrack(tripId: string): Promise<[number, number][]> {
    const rows = await this.db.getAll<{ geom: string }>(
      `SELECT geom FROM ${SYNC_TABLES.track_points} WHERE trip_id = ? ORDER BY recorded_at ASC`,
      [tripId],
    );
    return rows.map((r) => {
      const g = JSON.parse(r.geom) as { coordinates: [number, number] };
      return g.coordinates;
    });
  }
}

export const tracksRepository = new TracksRepository();
