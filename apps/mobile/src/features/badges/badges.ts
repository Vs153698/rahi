import { SYNC_TABLES, badgeLabel } from '@rahi/shared';

import { db } from '../../db/powersync';

/**
 * Earned badges (Task 10.2). The `badges` table is server-authoritative (written
 * when a recap generates) and synced read-only; this reads them for display.
 */
export interface EarnedBadge {
  id: string;
  kind: string;
  label: string;
  trip_id: string | null;
  awarded_at: string;
}

export async function listBadges(ownerId: string): Promise<EarnedBadge[]> {
  const rows = await db.getAll<{ id: string; kind: string; trip_id: string | null; awarded_at: string }>(
    `SELECT id, kind, trip_id, awarded_at FROM ${SYNC_TABLES.badges}
     WHERE owner_id = ? ORDER BY awarded_at DESC`,
    [ownerId],
  );
  return rows.map((r) => ({ ...r, label: badgeLabel(r.kind) }));
}
