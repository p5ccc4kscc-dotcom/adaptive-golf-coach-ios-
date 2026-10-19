/**
 * Minimal async SQL interface shared by:
 *  - expo-sqlite on iPhone/iPad (the real app)
 *  - sql.js (SQLite compiled to WebAssembly) in the browser preview and tests
 *
 * Both run the same SQL schema and migrations, so tests exercise real SQLite.
 */

export type SqlValue = string | number | null | Uint8Array;
export type SqlParams = readonly SqlValue[];

export interface SqlExecutor {
  /** Runs one or more statements with no parameters (schema, pragmas). */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParams): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T>(sql: string, params?: SqlParams): Promise<T | null>;
}

export interface SqlDriver extends SqlExecutor {
  /** Runs `fn` in an exclusive transaction; rolls back if it throws. */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** Simple FIFO mutex so async callers cannot interleave inside a transaction. */
export class Mutex {
  private tail: Promise<void> = Promise.resolve();

  async lock<T>(fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => (release = resolve));
    const previous = this.tail;
    this.tail = previous.then(() => next);
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}
