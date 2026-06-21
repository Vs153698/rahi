import { useEffect, useState } from 'react';

import {
  PRO_ENTITLEMENT,
  SYNC_TABLES,
  resolveEntitlementStatus,
  type Entitlement,
  type EntitlementStatus,
} from '@rahi/shared';

import { db } from '../db/powersync';

import { refreshAndStampEntitlement, resolveGraceStatus } from './grace';

const LOCKED: EntitlementStatus = { active: false, inGrace: false, expiresAt: null };

/** The more-permissive of two resolutions (server truth vs bounded grace). */
function combine(server: EntitlementStatus, grace: EntitlementStatus): EntitlementStatus {
  if (server.active) return server;
  if (grace.active) return grace;
  return LOCKED;
}

/**
 * useEntitlement('pro') (Task 5.4) — resolves Pro from the server-authoritative
 * synced `entitlements` row AND the device-local grace cache, taking whichever
 * grants access (grace is itself bounded). On mount it best-effort re-validates
 * online via RevenueCat and re-stamps the grace window. Works fully offline.
 */
export function useEntitlement(entitlement: typeof PRO_ENTITLEMENT = PRO_ENTITLEMENT): {
  status: EntitlementStatus;
  loading: boolean;
} {
  const [serverStatus, setServerStatus] = useState<EntitlementStatus>(LOCKED);
  const [graceStatus, setGraceStatus] = useState<EntitlementStatus>(LOCKED);
  const [loading, setLoading] = useState(true);

  // Re-validate online + refresh grace cache, then read the cache.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refreshAndStampEntitlement();
      const g = await resolveGraceStatus();
      if (!cancelled) {
        setGraceStatus(g);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // React to the synced server entitlement row.
  useEffect(() => {
    const controller = new AbortController();
    void db.watch(
      `SELECT * FROM ${SYNC_TABLES.entitlements} WHERE entitlement = ? LIMIT 1`,
      [entitlement],
      {
        onResult: (result) => {
          const row = (result.rows?._array?.[0] ?? null) as Entitlement | null;
          setServerStatus(resolveEntitlementStatus(row));
          setLoading(false);
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [entitlement]);

  return { status: combine(serverStatus, graceStatus), loading };
}
