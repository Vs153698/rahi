import { randomUUID } from 'expo-crypto';

import { SYNC_TABLES, type SosKind } from '@rahi/shared';

import { BaseRepository } from './base.repository';

/**
 * sos_events repository. Records the SOS locally first (source of truth) and
 * queues it for the cloud via the durable PowerSync queue — so an alert raised in
 * a dead zone is delivered the instant any signal returns (rahi-docs/05, /10).
 * `delivery` captures what was actually attempted per platform (no false claims).
 */
interface DeliveryRecord {
  sms_sent?: boolean;
  cloud_queued?: boolean;
  native_sos?: boolean;
  precomposed?: boolean;
}

class SosRepository extends BaseRepository {
  async record(params: {
    ownerId: string;
    tripId: string | null;
    kind: SosKind;
    lng: number;
    lat: number;
    delivery: DeliveryRecord;
  }): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(
        `INSERT INTO ${SYNC_TABLES.sos_events}
           (id, owner_id, trip_id, kind, geom, delivery, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          params.ownerId,
          params.tripId,
          params.kind,
          JSON.stringify({ type: 'Point', coordinates: [params.lng, params.lat] }),
          JSON.stringify(params.delivery),
          now,
          now,
        ],
      ),
    );
    return id;
  }

  async resolve(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.write((tx) =>
      tx.execute(`UPDATE ${SYNC_TABLES.sos_events} SET resolved_at = ?, updated_at = ? WHERE id = ?`, [
        now,
        now,
        id,
      ]),
    );
  }
}

export const sosRepository = new SosRepository();
