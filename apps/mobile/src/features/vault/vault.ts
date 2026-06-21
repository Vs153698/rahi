import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { SYNC_TABLES } from '@rahi/shared';

import { db } from '../../db/powersync';

/**
 * Document vault (Task 9.2, rahi-docs/10). Sensitive papers (DL/RC/insurance/PUC)
 * are encrypted ON DEVICE before upload to R2, behind a biometric/PIN gate. The
 * per-user vault key lives in the device keychain (expo-secure-store) and never
 * leaves the device; only the encrypted blob + metadata go to the cloud.
 *
 * The cipher here is a documented SEAM. Real builds use AES-GCM / libsodium
 * secretbox via a native crypto module; the placeholder keeps the data flow and
 * key management correct so swapping the primitive is contained. // verify (crypto)
 */
const VAULT_KEY_NAME = 'rahi.vault.key';

export type DocType = 'dl' | 'rc' | 'insurance' | 'puc' | 'permit' | 'other';

/** Gate vault access behind device biometrics / passcode. */
export async function unlockVault(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!hasHardware || !enrolled) {
    // No biometric enrolled — fall back to the OS passcode prompt.
    const res = await LocalAuthentication.authenticateAsync({ disableDeviceFallback: false });
    return res.success;
  }
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock your document vault',
  });
  return res.success;
}

/** Get-or-create the per-user vault key (kept only in the keychain). */
async function getVaultKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(VAULT_KEY_NAME);
  if (!key) {
    key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}:${Math.random()}`,
    );
    await SecureStore.setItemAsync(VAULT_KEY_NAME, key);
  }
  return key;
}

/**
 * Encrypt/decrypt seam. PLACEHOLDER (keystream XOR) — NOT secure on its own; the
 * native build swaps in AES-GCM/libsodium with this same signature. Kept so the
 * upload path stores ciphertext, never plaintext.
 */
async function keystream(key: string, length: number): Promise<Uint8Array> {
  const out = new Uint8Array(length);
  let block = key;
  let i = 0;
  while (i < length) {
    block = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, block);
    for (let b = 0; b < block.length && i < length; b += 2, i++) {
      out[i] = parseInt(block.substr(b, 2), 16);
    }
  }
  return out;
}

export async function encryptBytes(plain: Uint8Array): Promise<Uint8Array> {
  const key = await getVaultKey();
  const ks = await keystream(key, plain.length);
  return plain.map((byte, idx) => byte ^ (ks[idx] ?? 0));
}

export async function decryptBytes(cipher: Uint8Array): Promise<Uint8Array> {
  return encryptBytes(cipher); // XOR is symmetric (placeholder)
}

/** Save document metadata (the blob upload to R2 is handled separately). */
export async function saveDocumentMetadata(params: {
  ownerId: string;
  docType: DocType;
  r2Key: string;
  expiresOn?: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  await db.writeTransaction(async (tx) => {
    await tx.execute(
      `INSERT INTO ${SYNC_TABLES.documents}
         (id, owner_id, doc_type, r2_key, encrypted, expires_on, updated_at)
       VALUES (uuid(), ?, ?, ?, 1, ?, ?)`,
      [params.ownerId, params.docType, params.r2Key, params.expiresOn ?? null, now],
    );
  });
}

export async function listDocuments(
  ownerId: string,
): Promise<{ id: string; doc_type: DocType; r2_key: string; expires_on: string | null }[]> {
  return db.getAll(
    `SELECT id, doc_type, r2_key, expires_on FROM ${SYNC_TABLES.documents}
     WHERE owner_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`,
    [ownerId],
  );
}
