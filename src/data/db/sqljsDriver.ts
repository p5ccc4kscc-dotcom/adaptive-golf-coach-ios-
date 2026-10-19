import type { Database, SqlJsStatic } from 'sql.js';

import { Mutex, SqlDriver, SqlExecutor, SqlParams } from './driver';

const PRAGMA_ONLY = /^\s*(PRAGMA\s+[^;]*;\s*)+$/i;

/**
 * sql.js driver. Used by the browser preview and by Node tests. `onWrite`
 * lets the browser persist the database file after each committed change.
 */
export function createSqlJsDriver(
  SQL: SqlJsStatic,
  options: { data?: Uint8Array | null; onWrite?: (bytes: Uint8Array) => Promise<void> } = {},
): SqlDriver {
  const db: Database = options.data ? new SQL.Database(options.data) : new SQL.Database();
  db.exec('PRAGMA foreign_keys = ON;');
  const mutex = new Mutex();
  let inTransaction = false;

  const persist = async () => {
    if (!options.onWrite || inTransaction) return;
    const bytes = db.export();
    // export() can reset connection pragmas in some sql.js versions.
    db.exec('PRAGMA foreign_keys = ON;');
    await options.onWrite(bytes);
  };

  const raw: SqlExecutor = {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: SqlParams = []) {
      db.run(sql, params as (string | number | null | Uint8Array)[]);
      return { changes: db.getRowsModified() };
    },
    async all<T>(sql: string, params: SqlParams = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params as (string | number | null | Uint8Array)[]);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async get<T>(sql: string, params: SqlParams = []) {
      const rows = await raw.all<T>(sql, params);
      return rows[0] ?? null;
    },
  };

  return {
    exec: (sql) =>
      mutex.lock(async () => {
        await raw.exec(sql);
        // Connection pragmas change no stored data, so they are not saved.
        if (!PRAGMA_ONLY.test(sql)) await persist();
      }),
    run: (sql, params) =>
      mutex.lock(async () => {
        const r = await raw.run(sql, params);
        await persist();
        return r;
      }),
    all: (sql, params) => mutex.lock(() => raw.all(sql, params)),
    get: (sql, params) => mutex.lock(() => raw.get(sql, params)),
    transaction: (fn) =>
      mutex.lock(async () => {
        db.exec('BEGIN IMMEDIATE;');
        inTransaction = true;
        let result: Awaited<ReturnType<typeof fn>>;
        try {
          result = await fn(raw);
          db.exec('COMMIT;');
        } catch (e) {
          db.exec('ROLLBACK;');
          throw e;
        } finally {
          inTransaction = false;
        }
        // Saved only after a successful commit; a refused save surfaces to the caller.
        await persist();
        return result;
      }),
    close: async () => {
      db.close();
    },
  };
}

