import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

import { SqlDriver, SqlExecutor, SqlParams } from './driver';

const bind = (params: SqlParams = []) => params as SQLiteBindValue[];

function executor(db: Pick<SQLiteDatabase, 'execAsync' | 'runAsync' | 'getAllAsync' | 'getFirstAsync'>): SqlExecutor {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params) => {
      const r = await db.runAsync(sql, bind(params));
      return { changes: r.changes };
    },
    all: <T>(sql: string, params?: SqlParams) => db.getAllAsync<T>(sql, bind(params)),
    get: <T>(sql: string, params?: SqlParams) => db.getFirstAsync<T>(sql, bind(params)),
  };
}

/** expo-sqlite driver for the native iPhone/iPad app. */
export function createExpoSqliteDriver(db: SQLiteDatabase): SqlDriver {
  const base = executor(db);
  return {
    ...base,
    transaction: async <T>(fn: (tx: SqlExecutor) => Promise<T>) => {
      let result: T;
      // Exclusive transactions stop other queries interleaving mid-transaction.
      await db.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(executor(txn));
      });
      return result!;
    },
    close: () => db.closeAsync(),
  };
}
