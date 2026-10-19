import Constants from 'expo-constants';
import type { SqlJsStatic } from 'sql.js';

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

const IDB_NAME = 'adaptive-golf-coach';
const IDB_STORE = 'sqlite';
const IDB_KEY = 'main-db';

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

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase): Promise<Uint8Array | null> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result as ArrayBuffer) : null);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, bytes: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(bytes.slice().buffer, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function openAppDatabase(): Promise<OpenedDatabase> {
  if (!window.initSqlJs) await loadScript(`${vendorBase()}sql-wasm.js`);
  if (!window.initSqlJs) throw new Error('SQLite for the browser preview failed to load.');
  const SQL = await window.initSqlJs({ locateFile: (file) => `${vendorBase()}${file}` });

  let idb: IDBDatabase | null = null;
  let existing: Uint8Array | null = null;
  try {
    idb = await openIdb();
    existing = await idbGet(idb);
  } catch {
    idb = null;
  }
  const store = idb;
  const driver = createSqlJsDriver(SQL, {
    data: existing,
    onWrite: store ? (bytes) => idbPut(store, bytes) : undefined,
  });
  return {
    driver,
    persistent: !!store,
    storageLabel: store
      ? 'Browser preview: stored only in this browser on this device (IndexedDB).'
      : 'Browser preview: this browser is blocking storage, so changes will be lost when the page closes.',
  };
}
