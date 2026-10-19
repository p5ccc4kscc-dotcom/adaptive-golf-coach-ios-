import Constants from 'expo-constants';
import type { SqlJsStatic } from 'sql.js';

import { StaleWriteError, loadDb, openIdbStore, saveDb } from './idbStore';
import { createSqlJsDriver } from './sqljsDriver';
import type { OpenedDatabase } from './openDatabase';

/**
 * Browser preview: SQLite (sql.js WebAssembly) persisted to this browser's
 * IndexedDB. Data stays in this browser on this device only; nothing is sent
 * anywhere. This is a preview channel — the real app uses native SQLite.
 */

declare global {
  interface Window {
    initSqlJs?: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
  }
}


/** Respects experiments.baseUrl (e.g. GitHub Pages serves the app under /<repo>/). */
function vendorBase(): string {
  const baseUrl = (Constants.expoConfig?.experiments?.baseUrl ?? '').replace(/\/$/, '');
  return `${window.location.origin}${baseUrl}/vendor/sqljs/`;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Could not load ${src}`));
    document.head.appendChild(el);
  });
}

export async function openAppDatabase(): Promise<OpenedDatabase> {
  if (!window.initSqlJs) await loadScript(`${vendorBase()}sql-wasm.js`);
  if (!window.initSqlJs) throw new Error('SQLite for the browser preview failed to load.');
  const SQL = await window.initSqlJs({ locateFile: (file) => `${vendorBase()}${file}` });

  let idb: IDBDatabase | null = null;
  let existing: Uint8Array | null = null;
  let rev = 0;
  try {
    idb = await openIdbStore(indexedDB);
    const loaded = await loadDb(idb);
    existing = loaded.bytes;
    rev = loaded.rev;
  } catch (e) {
    // Visible in the browser console (no personal data); the UI also warns the golfer.
    console.warn(`[storage] IndexedDB unavailable, changes will not persist: ${e instanceof Error ? e.message : String(e)}`);
    idb = null;
  }
  const store = idb;
  const conflictListeners = new Set<(message: string) => void>();
  const driver = createSqlJsDriver(SQL, {
    data: existing,
    onWrite: store
      ? async (bytes) => {
          try {
            rev = await saveDb(store, bytes, rev);
          } catch (e) {
            if (e instanceof StaleWriteError) {
              console.warn(`[storage] ${e.message}`);
              for (const l of conflictListeners) l(e.message);
            }
            throw e;
          }
        }
      : undefined,
  });
  return {
    driver,
    persistent: !!store,
    storageLabel: store
      ? 'Browser preview: stored only in this browser on this device (IndexedDB).'
      : 'Browser preview: this browser is blocking storage, so changes will be lost when the page closes.',
    onStorageConflict: (listener) => {
      conflictListeners.add(listener);
      return () => conflictListeners.delete(listener);
    },
  };
}
