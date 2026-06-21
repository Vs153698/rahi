import {
  detectLostMembers,
  generateInviteCode,
  inviteLink,
  isValidInviteCode,
  normalizeInviteCode,
} from './group';

describe('invite codes', () => {
  it('generates a 6-char code from the unambiguous alphabet', () => {
    // Deterministic RNG → deterministic code.
    let i = 0;
    const seq = [0, 0.2, 0.4, 0.6, 0.8, 0.99];
    const code = generateInviteCode(() => seq[i++ % seq.length]!);
    expect(code).toHaveLength(6);
    expect(isValidInviteCode(code)).toBe(true);
    expect(code).not.toMatch(/[01OI]/); // no ambiguous chars
  });

  it('normalises user input (case, spaces, hyphens)', () => {
    expect(normalizeInviteCode(' ab-cd 23 ')).toBe('ABCD23');
  });

  it('rejects malformed codes', () => {
    expect(isValidInviteCode('ABC')).toBe(false);
    expect(isValidInviteCode('ABCD2I')).toBe(false); // I not in alphabet
  });

  it('builds a join link', () => {
    expect(inviteLink('abc234')).toBe('https://rahi.in/join/ABC234');
  });
});

describe('detectLostMembers', () => {
  const now = 1_000_000;
  it('flags members stale beyond the timeout, sorted', () => {
    const lost = detectLostMembers(
      [
        { memberId: 'b', lastUpdateMs: now - 5000 }, // fresh
        { memberId: 'a', lastUpdateMs: now - 200_000 }, // stale
        { memberId: 'c', lastUpdateMs: now - 300_000 }, // stale
      ],
      now,
      60_000,
    );
    expect(lost).toEqual(['a', 'c']);
  });

  it('returns empty when everyone is fresh (alert clears)', () => {
    expect(detectLostMembers([{ memberId: 'a', lastUpdateMs: now }], now, 60_000)).toEqual([]);
  });
});
