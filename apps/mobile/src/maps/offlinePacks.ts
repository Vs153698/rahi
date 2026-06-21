import * as FileSystem from 'expo-file-system';

import { SYNC_TABLES } from '@rahi/shared';

import { db } from '../db/powersync';

import { shouldWarnBeforeDownload } from './storage';

/**
 * Offline tile-pack manager (Task 2.2, rahi-docs/07 §1, §7). Pack metadata syncs
 * via the `tile_packs` table (read-only on device); the binary PMTiles file is
 * downloaded from R2 to local storage on wifi, with progress and storage
 * management. Downloading a pack is a Pro feature — gated behind the cached
 * `pro` entitlement (stub until Phase 5).
 */
const PACKS_DIR = `${FileSystem.documentDirectory ?? ''}tile-packs/`;

export interface TilePackRow {
  id: string;
  trip_id: string;
  pmtiles_url: string;
  size_bytes: number;
  status: string;
}

export interface LocalPack {
  id: string;
  path: string;
  sizeBytes: number;
}

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PACKS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PACKS_DIR, { intermediates: true });
}

function packPath(id: string): string {
  return `${PACKS_DIR}${id}.pmtiles`;
}

/** Pack rows available for the user's trips (synced metadata). */
export async function listAvailablePacks(): Promise<TilePackRow[]> {
  const result = await db.getAll<TilePackRow>(
    `SELECT id, trip_id, pmtiles_url, size_bytes, status FROM ${SYNC_TABLES.tile_packs}
     WHERE status = 'ready'`,
  );
  return result;
}

/** Locally downloaded packs (for the storage screen). */
export async function listLocalPacks(): Promise<LocalPack[]> {
  await ensureDir();
  const names = await FileSystem.readDirectoryAsync(PACKS_DIR);
  const packs: LocalPack[] = [];
  for (const name of names.filter((n) => n.endsWith('.pmtiles'))) {
    const path = `${PACKS_DIR}${name}`;
    const info = await FileSystem.getInfoAsync(path, { size: true });
    packs.push({ id: name.replace('.pmtiles', ''), path, sizeBytes: info.exists ? (info.size ?? 0) : 0 });
  }
  return packs;
}

export class ProRequiredError extends Error {
  constructor() {
    super('Offline map packs are a Rahi Pro feature.');
    this.name = 'ProRequiredError';
  }
}

export interface DownloadOptions {
  isPro: boolean;
  onWifi: boolean;
  /** Caller confirmed a large/metered download warning. */
  confirmedLarge?: boolean;
  onProgress?: (fraction: number) => void;
}

/**
 * Download a pack's PMTiles file to local storage. Pro-gated; warns before large
 * or off-wifi downloads (caller must pass confirmedLarge to proceed).
 */
export async function downloadPack(pack: TilePackRow, opts: DownloadOptions): Promise<LocalPack> {
  if (!opts.isPro) throw new ProRequiredError();
  if (shouldWarnBeforeDownload(pack.size_bytes, opts.onWifi) && !opts.confirmedLarge) {
    throw new Error('Large/metered download not confirmed');
  }
  await ensureDir();
  const dest = packPath(pack.id);

  const resumable = FileSystem.createDownloadResumable(
    pack.pmtiles_url,
    dest,
    {},
    (p) => {
      if (p.totalBytesExpectedToWrite > 0) {
        opts.onProgress?.(p.totalBytesWrittenSoFar / p.totalBytesExpectedToWrite);
      }
    },
  );
  const result = await resumable.downloadAsync();
  const info = await FileSystem.getInfoAsync(result?.uri ?? dest, { size: true });
  return { id: pack.id, path: dest, sizeBytes: info.exists ? (info.size ?? 0) : 0 };
}

export async function deletePack(id: string): Promise<void> {
  const path = packPath(id);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
}

/** Local file path for a pack if it's been downloaded, else null. */
export async function localPackPath(id: string): Promise<string | null> {
  const path = packPath(id);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}
