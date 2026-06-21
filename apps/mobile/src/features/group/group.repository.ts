import { normalizeInviteCode } from '@rahi/shared';

import { env } from '../../config/env';
import { supabase } from '../../supabase';

/**
 * Group create/join (Task 7.1). Done via the API (online) so invite codes stay
 * unique server-side; the resulting `groups`/`group_members` rows then sync to
 * the device and drive its data scope. Convoy itself is online-first in Phase 7
 * and gains mesh transport in Phase 8.
 */
export interface GroupResult {
  id: string;
  trip_id: string;
  name: string;
  invite_code: string;
}

async function authedPost<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export function createGroup(tripId: string, name: string): Promise<GroupResult> {
  return authedPost<GroupResult>('/groups', { tripId, name });
}

export function joinGroupByCode(code: string, bikeId?: string): Promise<GroupResult> {
  return authedPost<GroupResult>('/groups/join', { code: normalizeInviteCode(code), bikeId });
}
