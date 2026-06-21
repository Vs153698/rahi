import { SYNC_TABLES, WRITABLE_SYNC_TABLES, type SyncTableName } from '@rahi/shared';

/**
 * Versioned manifest of what the PowerSync sync rules expose. The YAML in
 * `sync-rules.yaml` is the source of truth uploaded to PowerSync; this module
 * mirrors it for type-safe references and a version stamp bumped whenever the
 * rules or synced schema change (rahi-docs/05 §2).
 */
export const SYNC_RULES_VERSION = '1.0.0-phase1' as const;

export type BucketName = 'user' | 'group';

export interface SyncTableSpec {
  table: SyncTableName;
  /** Whether the client may push writes, or it is pull-only (server-authoritative). */
  writable: boolean;
  bucket: BucketName;
}

const writable = (t: SyncTableName): boolean => WRITABLE_SYNC_TABLES.includes(t);

export const SYNC_TABLE_SPECS: readonly SyncTableSpec[] = [
  // user bucket
  { table: SYNC_TABLES.profiles, writable: writable(SYNC_TABLES.profiles), bucket: 'user' },
  { table: SYNC_TABLES.bikes, writable: writable(SYNC_TABLES.bikes), bucket: 'user' },
  {
    table: SYNC_TABLES.emergency_contacts,
    writable: writable(SYNC_TABLES.emergency_contacts),
    bucket: 'user',
  },
  { table: SYNC_TABLES.trips, writable: writable(SYNC_TABLES.trips), bucket: 'user' },
  { table: SYNC_TABLES.fuel_logs, writable: writable(SYNC_TABLES.fuel_logs), bucket: 'user' },
  { table: SYNC_TABLES.sos_events, writable: writable(SYNC_TABLES.sos_events), bucket: 'user' },
  { table: SYNC_TABLES.documents, writable: writable(SYNC_TABLES.documents), bucket: 'user' },
  { table: SYNC_TABLES.badges, writable: false, bucket: 'user' },
  { table: SYNC_TABLES.subscriptions, writable: false, bucket: 'user' },
  { table: SYNC_TABLES.entitlements, writable: false, bucket: 'user' },
  // group bucket
  { table: SYNC_TABLES.groups, writable: writable(SYNC_TABLES.groups), bucket: 'group' },
  {
    table: SYNC_TABLES.group_members,
    writable: writable(SYNC_TABLES.group_members),
    bucket: 'group',
  },
  { table: SYNC_TABLES.expenses, writable: writable(SYNC_TABLES.expenses), bucket: 'group' },
  {
    table: SYNC_TABLES.expense_shares,
    writable: writable(SYNC_TABLES.expense_shares),
    bucket: 'group',
  },
  { table: SYNC_TABLES.kitty, writable: writable(SYNC_TABLES.kitty), bucket: 'group' },
  {
    table: SYNC_TABLES.kitty_contributions,
    writable: writable(SYNC_TABLES.kitty_contributions),
    bucket: 'group',
  },
  { table: SYNC_TABLES.settlements, writable: writable(SYNC_TABLES.settlements), bucket: 'group' },
  { table: SYNC_TABLES.routes, writable: false, bucket: 'group' },
  { table: SYNC_TABLES.tile_packs, writable: false, bucket: 'group' },
  { table: SYNC_TABLES.poi_corridor_sync, writable: false, bucket: 'group' },
  {
    table: SYNC_TABLES.track_points,
    writable: writable(SYNC_TABLES.track_points),
    bucket: 'group',
  },
  { table: SYNC_TABLES.recaps, writable: false, bucket: 'group' },
  {
    table: SYNC_TABLES.convoy_positions,
    writable: writable(SYNC_TABLES.convoy_positions),
    bucket: 'group',
  },
  {
    table: SYNC_TABLES.regroup_points,
    writable: writable(SYNC_TABLES.regroup_points),
    bucket: 'group',
  },
  {
    table: SYNC_TABLES.group_messages,
    writable: writable(SYNC_TABLES.group_messages),
    bucket: 'group',
  },
] as const;
