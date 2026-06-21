import { detectLostMembers, type MemberPresence } from '@rahi/shared';

import type { ConvoyMember } from './convoy.repository';

/**
 * Lost-member alert (Task 7.3). A member whose position hasn't updated within the
 * timeout is flagged; the alert clears automatically when they reappear. Pure
 * detection lives in shared; this adapts the convoy rows and applies the default
 * timeout.
 */
const DEFAULT_TIMEOUT_MS = 3 * 60 * 1000; // 3 min without a position update

export function findLostMembers(
  members: ConvoyMember[],
  now: number = Date.now(),
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): string[] {
  const presence: MemberPresence[] = members
    .filter((m) => m.updated_at != null)
    .map((m) => ({ memberId: m.member_id, lastUpdateMs: Date.parse(m.updated_at as string) }));
  return detectLostMembers(presence, now, timeoutMs);
}
