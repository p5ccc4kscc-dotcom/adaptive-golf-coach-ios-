import { STORAGE_IDS } from './storageIds';

/**
 * Browser-preview persistence of the whole SQLite file in IndexedDB, with a
 * revision guard.
 *
 * Every page instance holds its own in-memory copy of the database and saves
 * the complete file. Without a guard, an instance holding an *older* copy (a
 * second tab, a page restored by the back button, or a page still finishing a
 * save while a new page loads) could silently overwrite newer data. Each save
 * therefore states the revision it was based on; if storage has moved on, the
 * save is refused with StaleWriteError and nothing is overwritten.
 */

const STORE = 'sqlite';
const DATA_KEY = 'main-db';
const REV_KEY = 'main-db-rev';

export class StaleWriteError extends Error {
  constructor(
    readonly expectedRev: number,
    readonly actualRev: number,
  ) {
    super(`Saved data changed elsewhere (expected revision ${expectedRev}, found ${actualRev}). Reload to continue.`);
    this.name = 'StaleWriteError';
  }
}

export interface LoadedDb {
  bytes: Uint8Array | null;
  rev: number;
}

export function openIdbStore(factory: IDBFactory, name: string = STORAGE_IDS.indexedDbName): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = factory.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const toBytes = (v: unknown): Uint8Array | null => (v ? new Uint8Array(v as ArrayBuffer) : null);

export function loadDb(db: IDBDatabase): Promise<LoadedDb> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const dataReq = store.get(DATA_KEY);
    const revReq = store.get(REV_KEY);
    tx.oncomplete = () => resolve({ bytes: toBytes(dataReq.result), rev: typeof revReq.result === 'number' ? revReq.result : 0 });
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Saves `bytes` only if storage is still at `expectedRev`, atomically.
 * Resolves with the new revision.
 */
export function saveDb(db: IDBDatabase, bytes: Uint8Array, expectedRev: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    let stale: StaleWriteError | null = null;
    const next = expectedRev + 1;
    const revReq = store.get(REV_KEY);
    revReq.onsuccess = () => {
      const current = typeof revReq.result === 'number' ? revReq.result : 0;
      if (current !== expectedRev) {
        stale = new StaleWriteError(expectedRev, current);
        tx.abort();
        return;
      }
      store.put(bytes.slice().buffer, DATA_KEY);
      store.put(next, REV_KEY);
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(stale ?? tx.error ?? new Error('Save aborted'));
    tx.onerror = () => {
      if (!stale) reject(tx.error);
    };
  });
}
