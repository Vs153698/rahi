import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, type GroupRole } from '@rahi/shared';

import { BaseRepository } from '../../db/repositories/base.repository';

/**
 * Convoy data (Task 7.2). Each member broadcasts a live position (one row per
 * member per group, LWW); regroup points are pins the lead drops. Online-first in
 * Phase 7 — Phase 8 mesh writes these SAME tables, so the convoy map keeps
 * working off-grid with no rework.
 */
export interface ConvoyMember {
  member_id: string;
  role: GroupRole;
  profile_id: string;
  lng: number | null;
  lat: number | null;
  updated_at: string | null;
}

interface PositionRow {
  member_id: string;
  role: GroupRole;
  profile_id: string;
  geom: string | null;
  updated_at: string | null;
}

function parsePoint(geom: string | null): { lng: number | null; lat: number | null } {
  if (!geom) return { lng: null, lat: null };
  try {
    const g = JSON.parse(geom) as { coordinates: [number, number] };
    return { lng: g.coordinates[0], lat: g.coordinates[1] };
  } catch {
    return { lng: null, lat: null };
  }
}

class ConvoyRepository extends BaseRepository {
  /** Upsert this member's live position (one row per member). */
  async broadcastPosition(groupId: string, memberId: string, lng: number, lat: number): Promise<void> {
    const now = new Date().toISOString();
    const geom = JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
    await this.write(async (tx) => {
      const existing = await this.db.getAll<{ id: string }>(
        `SELECT id FROM ${SYNC_TABLES.convoy_positions} WHERE group_id = ? AND member_id = ? LIMIT 1`,
        [groupId, memberId],
      );
      if (existing[0]) {
        await tx.execute(
          `UPDATE ${SYNC_TABLES.convoy_positions}
             SET geom = ?, client_updated_at = ?, updated_at = ? WHERE id = ?`,
          [geom, now, now, existing[0].id],
        );
      } else {
        await tx.execute(
          `INSERT INTO ${SYNC_TABLES.convoy_positions}
             (id, group_id, member_id, geom, client_updated_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [randomUUID(), groupId, memberId, geom, now, now],
        );
      }
    });
  }

  /** Reactively watch members (roles + latest positions) for the convoy map. */
  watchMembers(groupId: string, onChange: (members: ConvoyMember[]) => void): () => void {
    const controller = new AbortController();
    void this.db.watch(
      `SELECT gm.id AS member_id, gm.role AS role, gm.profile_id AS profile_id,
              cp.geom AS geom, cp.updated_at AS updated_at
       FROM ${SYNC_TABLES.group_members} gm
       LEFT JOIN ${SYNC_TABLES.convoy_positions} cp
         ON cp.member_id = gm.id AND cp.group_id = gm.group_id
       WHERE gm.group_id = ? AND gm.deleted_at IS NULL`,
      [groupId],
      {
        onResult: (r) => {
          const rows = (r.rows?._array ?? []) as PositionRow[];
          onChange(
            rows.map((row) => ({
              member_id: row.member_id,
              role: row.role,
              profile_id: row.profile_id,
              updated_at: row.updated_at,
              ...parsePoint(row.geom),
            })),
          );
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }

  /** Lead drops a regroup point. */
  async addRegroupPoint(groupId: string, createdByMemberId: string, lng: number, lat: number, label?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.regroup_points}
           (id, group_id, created_by, geom, label, client_updated_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          groupId,
          createdByMemberId,
          JSON.stringify({ type: 'Point', coordinates: [lng, lat] }),
          label ?? null,
          now,
          now,
        ],
      ),
    );
  }
}

export const convoyRepository = new ConvoyRepository();
