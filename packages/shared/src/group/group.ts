/**
 * Group + convoy helpers (Phase 7). Pure logic shared by app + API: invite-code
 * format, roles, and lost-member detection. Randomness is injected so generation
 * stays testable and deterministic where it matters.
 */
export type GroupRole = 'lead' | 'sweep' | 'member';
export const GROUP_ROLES: GroupRole[] = ['lead', 'sweep', 'member'];

// Unambiguous alphabet (no 0/O/1/I) for codes read aloud / typed at a dhaba.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

/** Generate an invite code using an injected RNG (default Math.random). */
export function generateInviteCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Normalise user input (uppercase, strip spaces/hyphens) before lookup. */
export function normalizeInviteCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidInviteCode(input: string): boolean {
  const c = normalizeInviteCode(input);
  return c.length === CODE_LENGTH && [...c].every((ch) => CODE_ALPHABET.includes(ch));
}

/** Build a shareable join link for a code (deep link into the app). */
export function inviteLink(code: string): string {
  return `https://rahi.in/join/${normalizeInviteCode(code)}`;
}

export interface MemberPresence {
  memberId: string;
  /** Epoch ms of this member's last position/presence update. */
  lastUpdateMs: number;
}

/**
 * Lost-member detection (Task 7.3): a member is "lost" when their presence
 * hasn't updated within `timeoutMs`. Pure — returns the stale member ids; an
 * empty result means everyone is accounted for (alert clears on return).
 */
export function detectLostMembers(
  members: MemberPresence[],
  now: number,
  timeoutMs: number,
): string[] {
  return members
    .filter((m) => now - m.lastUpdateMs > timeoutMs)
    .map((m) => m.memberId)
    .sort();
}
