import {
  PRO_ENTITLEMENT,
  computeGraceUntil,
  resolveWithGrace,
  type EntitlementStatus,
} from '@rahi/shared';

import { db } from '../db/powersync';

import { validatePro } from './revenuecat';

/**
 * Offline entitlement grace (rahi-docs/05 §7b, /09 A4, Task 5.4). The critical
 * piece for a paid offline-first app: you can't reach the store to validate while
 * offline, but a subscriber is offline for days exactly when they need Pro.
 *
 * On every online launch/foreground we validate via RevenueCat and stamp
 * `last_validated_at` + `grace_until = now + N days` into the device-local
 * `entitlement_cache_meta`. While offline the app trusts the cached active flag
 * until `grace_until`; past that, access ends (server authoritative on reconnect).
 * Bounded, so a cancelled sub can't ride free forever.
 */
const TABLE = 'entitlement_cache_meta';

async function readCache(): Promise<{ active: boolean; graceUntil: string | null } | null> {
  const rows = await db.getAll<{ active: number; grace_until: string | null }>(
    `SELECT active, grace_until FROM ${TABLE} WHERE entitlement = ? LIMIT 1`,
    [PRO_ENTITLEMENT],
  );
  const row = rows[0];
  if (!row) return null;
  return { active: row.active === 1, graceUntil: row.grace_until };
}

async function writeCache(active: boolean, now: number): Promise<void> {
  const graceUntil = active ? computeGraceUntil(now) : null;
  await db.writeTransaction(async (tx) => {
    await tx.execute(`DELETE FROM ${TABLE} WHERE entitlement = ?`, [PRO_ENTITLEMENT]);
    await tx.execute(
      `INSERT INTO ${TABLE} (id, entitlement, active, last_validated_at, grace_until)
       VALUES (uuid(), ?, ?, ?, ?)`,
      [PRO_ENTITLEMENT, active ? 1 : 0, new Date(now).toISOString(), graceUntil],
    );
  });
}

/** Online: validate via RevenueCat and refresh the grace window. Best-effort. */
export async function refreshAndStampEntitlement(): Promise<void> {
  try {
    const { active } = await validatePro();
    await writeCache(active, Date.now());
  } catch {
    // Offline or RC unavailable — keep the existing cache + grace window.
  }
}

/** Resolve Pro using the cached entitlement + bounded grace (works offline). */
export async function resolveGraceStatus(): Promise<EntitlementStatus> {
  const cache = await readCache();
  return resolveWithGrace(cache);
}
