/* eslint-disable rahi/no-direct-db-write-outside-repo --
   reason: This IS the sanctioned data-layer write bridge. The connector applies
   PowerSync's durable local write queue back to Postgres (Supabase upsert/update/
   delete) on reconnect. It is not feature code; feature writes still go through
   repositories. Exempting only this file keeps the repository rule strict
   everywhere else (rahi-docs/05 §1, /10). */
import {
  AbstractPowerSyncDatabase,
  type PowerSyncBackendConnector,
  UpdateType,
} from '@powersync/react-native';

import { env } from '../config/env';
import { supabase } from '../supabase';

/**
 * Connects PowerSync to Supabase: provides the sync-service credentials and
 * applies the local write queue back to Postgres when online. Writes go through
 * Supabase (RLS-enforced) — entitlements are pull-only and never appear here.
 *
 * Conflict strategy is server-authoritative for sync; local scalar conflicts on
 * `notes` resolve last-write-wins via `updated_at` (rahi-docs/05).
 */
export class SupabaseConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return {
      endpoint: env.powersyncUrl,
      token: data.session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = supabase.from(op.table);
        if (op.op === UpdateType.PUT) {
          const { error } = await table.upsert({ id: op.id, ...op.opData });
          if (error) throw error;
        } else if (op.op === UpdateType.PATCH) {
          const { error } = await table.update(op.opData ?? {}).eq('id', op.id);
          if (error) throw error;
        } else if (op.op === UpdateType.DELETE) {
          const { error } = await table.delete().eq('id', op.id);
          if (error) throw error;
        }
      }
      await transaction.complete();
    } catch (err) {
      // Leave the transaction in the queue to retry on next connectivity.
      throw err;
    }
  }
}
