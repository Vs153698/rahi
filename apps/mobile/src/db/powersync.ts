import { PowerSyncDatabase } from '@powersync/react-native';

import { isPowerSyncConfigured } from '../config/env';

import { SupabaseConnector } from './connector';
import { AppSchema } from './schema';

/**
 * The single local PowerSync database (SQLite, source of truth). Opened on cold
 * start WITHOUT awaiting the network (Task 0.7) — `connect()` is best-effort and
 * only succeeds when online + configured.
 */
export const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: { dbFilename: 'rahi.db' },
});

let connected = false;

/** Open the DB locally. Always safe offline. */
export async function openDatabase(): Promise<void> {
  await db.init();
}

/** Best-effort connect to the sync service. No-op until PowerSync is provisioned. */
export async function connectSync(): Promise<void> {
  if (connected || !isPowerSyncConfigured) return;
  await db.connect(new SupabaseConnector());
  connected = true;
}

export async function disconnectSync(): Promise<void> {
  if (!connected) return;
  await db.disconnect();
  connected = false;
}
