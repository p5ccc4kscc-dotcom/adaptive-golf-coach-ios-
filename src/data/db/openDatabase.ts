import * as SQLite from 'expo-sqlite';

import { SqlDriver } from './driver';
import { createExpoSqliteDriver } from './expoSqliteDriver';

export interface OpenedDatabase {
  driver: SqlDriver;
  /** False if data will not survive closing the app (e.g. blocked browser storage). */
  persistent: boolean;
  storageLabel: string;
  /**
   * Browser preview only: called if a save was refused because the stored data
   * changed elsewhere (another tab/window). Returns an unsubscribe function.
   */
  onStorageConflict?: (listener: (message: string) => void) => () => void;
}

/** Native (iPhone/iPad): a private SQLite file inside the app's sandbox. */
export async function openAppDatabase(): Promise<OpenedDatabase> {
  const db = await SQLite.openDatabaseAsync('adaptive-golf-coach.db');
  return { driver: createExpoSqliteDriver(db), persistent: true, storageLabel: 'Stored privately on this device (SQLite).' };
}
