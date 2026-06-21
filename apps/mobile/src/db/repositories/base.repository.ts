import { db } from '../powersync';

/** Minimal write-transaction surface (PowerSync `Transaction`). */
export interface WriteTx {
  execute: (sql: string, params?: unknown[]) => Promise<unknown>;
}

/**
 * Base for on-device repositories. ALL synced writes go through here so they
 * land in PowerSync's durable, ordered upload queue (persisted in SQLite) and
 * flush in order whenever connectivity returns — nothing is lost across kills,
 * crashes, or days offline (rahi-docs/05 §1, §5). Feature code must never call
 * `db.execute` directly; the `no-direct-db-write-outside-repo` lint enforces it.
 */
export abstract class BaseRepository {
  protected readonly db = db;

  /**
   * Run mutations in a single PowerSync write transaction. Mutations are
   * appended to the durable CRUD queue atomically and uploaded in order.
   */
  protected async write<T>(fn: (tx: WriteTx) => Promise<T>): Promise<T> {
    return this.db.writeTransaction(async (tx) => fn(tx as unknown as WriteTx));
  }
}
