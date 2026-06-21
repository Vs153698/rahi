/**
 * Mesh group encryption seam (rahi-docs/06 §5). Mesh membership is gated by the
 * group's invite code → a shared symmetric key; non-members can't decrypt.
 *
 *  - Bridgefy: the SDK already encrypts (Signal Protocol), so its adapter passes
 *    payloads straight through (passthrough cipher here).
 *  - Native (Multipeer/Nearby): we layer libsodium `crypto_secretbox` keyed off a
 *    key derived from the invite code. Wired behind this seam; the real libsodium
 *    binding is added with the native module (Spike-M), so Phase 8 ships the
 *    interface + a documented derivation.
 */
export interface GroupCipher {
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
}

/** Pass-through cipher for transports that encrypt themselves (Bridgefy). */
export const passthroughCipher: GroupCipher = {
  encrypt: (p) => p,
  decrypt: (c) => c,
};

/**
 * Derive a 32-byte group key from the invite code. Phase 8 uses a documented
 * placeholder KDF; the native module swaps in libsodium `crypto_pwhash` /
 * HKDF over the invite code + a server-provided salt. // verify (Spike-M)
 */
export function deriveGroupKeyMaterial(inviteCode: string, salt: string): string {
  // NOTE: not cryptographically strong on its own — replaced by libsodium HKDF
  // in the native build. Kept deterministic so peers derive the same key.
  return `${inviteCode}:${salt}`;
}
