import { useEffect, useState } from 'react';

import {
  PRO_ENTITLEMENT,
  SYNC_TABLES,
  resolveEntitlementStatus,
  type Entitlement,
  type EntitlementStatus,
} from '@rahi/shared';

import { db } from '../db/powersync';

/**
 * useEntitlement('pro') — reads the synced `entitlements` table reactively and
 * applies the offline grace window via the shared pure resolver. Phase 0: the
 * table is empty (server writes it from Phase 5), so this resolves to a stubbed
 * `active: false`. Works fully offline (rahi-docs/05, /09).
 */
export function useEntitlement(entitlement: typeof PRO_ENTITLEMENT = PRO_ENTITLEMENT): {
  status: EntitlementStatus;
  loading: boolean;
} {
  const [status, setStatus] = useState<EntitlementStatus>({
    active: false,
    inGrace: false,
    expiresAt: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void db.watch(
      `SELECT * FROM ${SYNC_TABLES.entitlements} WHERE entitlement = ? LIMIT 1`,
      [entitlement],
      {
        onResult: (result) => {
          const row = (result.rows?._array?.[0] ?? null) as Entitlement | null;
          setStatus(resolveEntitlementStatus(row));
          setLoading(false);
        },
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, [entitlement]);

  return { status, loading };
}
