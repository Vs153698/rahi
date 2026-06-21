import {
  deadZoneAhead,
  shouldEagerFlush,
  type DeadZoneAhead,
  type RouteCell,
} from '@rahi/shared';

import { env } from '../config/env';
import { supabase } from '../supabase';

import { connectSync } from '../db/powersync';

/**
 * Coverage-aware predictive sync (Task 10.4, rahi-docs/05 §5). Contributes
 * GPS+signal samples (with consent) so the crowd coverage layer improves, and
 * uses that layer to (a) warn before a long dead stretch and (b) eagerly flush
 * the durable upload queue the instant a known signal pocket is reached.
 * Decisions are the shared pure functions; this wraps them with I/O.
 */
export interface CoverageSample {
  lng: number;
  lat: number;
  signalDbm?: number | null;
  networkType?: string;
  sampledAt: string;
}

/** Upload coverage samples (requires the user's consent — passed explicitly). */
export async function contributeCoverage(consent: boolean, samples: CoverageSample[]): Promise<number> {
  if (!consent || samples.length === 0) return 0;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return 0;
  const res = await fetch(`${env.apiBaseUrl}/coverage/samples`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ consent: true, samples }),
  }).catch(() => null);
  if (!res?.ok) return 0;
  return ((await res.json()) as { accepted: number }).accepted;
}

/** Warn the rider about an upcoming dead stretch so they can flush now. */
export function deadZoneWarning(routeCells: RouteCell[], thresholdKm = 15): DeadZoneAhead {
  return deadZoneAhead(routeCells, thresholdKm);
}

/**
 * On a connectivity/coverage change: if we just entered a signal pocket with work
 * pending, eagerly reconnect + flush the queue (rahi-docs/05 §5).
 */
export async function onCoverageChange(params: {
  enteredSignal: boolean;
  pendingMutations: number;
}): Promise<void> {
  if (shouldEagerFlush(params)) {
    await connectSync();
  }
}
