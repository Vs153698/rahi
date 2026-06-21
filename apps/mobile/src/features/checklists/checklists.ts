import {
  PACKING_CHECKLIST,
  PERMIT_ZONES,
  checklistProgress,
  type ChecklistProgress,
} from '@rahi/shared';

import { db } from '../../db/powersync';

/**
 * Packing checklist + permits (Task 9.3). Content ships in-app (shared) so it's
 * available offline; the per-trip tick state is device-local (`checklist_checks`).
 */
export { PACKING_CHECKLIST, PERMIT_ZONES };

export async function getCheckedIds(tripId: string): Promise<Set<string>> {
  const rows = await db.getAll<{ item_id: string }>(
    `SELECT item_id FROM checklist_checks WHERE trip_id = ? AND checked = 1`,
    [tripId],
  );
  return new Set(rows.map((r) => r.item_id));
}

export async function toggleItem(tripId: string, itemId: string, checked: boolean): Promise<void> {
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM checklist_checks WHERE trip_id = ? AND item_id = ?`, [tripId, itemId]);
    await tx.execute(
      `INSERT INTO checklist_checks (id, trip_id, item_id, checked) VALUES (uuid(), ?, ?, ?)`,
      [tripId, itemId, checked ? 1 : 0],
    );
  });
}

export async function getProgress(tripId: string): Promise<ChecklistProgress> {
  return checklistProgress(PACKING_CHECKLIST, await getCheckedIds(tripId));
}
