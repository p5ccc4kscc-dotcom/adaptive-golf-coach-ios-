import 'fake-indexeddb/auto';
import { randomUUID } from 'node:crypto';
import initSqlJs from 'sql.js';

import { StaleWriteError, loadDb, openIdbStore, saveDb } from '@/data/db/idbStore';
import { createSqlJsDriver } from '@/data/db/sqljsDriver';
import { createRepositories } from '@/data/repositories';

import { clubFields } from './helpers';

const fresh = () => openIdbStore(indexedDB, `test-${randomUUID()}`);

describe('revision-guarded browser storage', () => {
  it('starts empty at revision 0 and increments on each save', async () => {
    const db = await fresh();
    expect(await loadDb(db)).toEqual({ bytes: null, rev: 0 });
    const r1 = await saveDb(db, new Uint8Array([1, 2, 3]), 0);
    const r2 = await saveDb(db, new Uint8Array([4]), r1);
    expect([r1, r2]).toEqual([1, 2]);
    const loaded = await loadDb(db);
    expect(Array.from(loaded.bytes!)).toEqual([4]);
    expect(loaded.rev).toBe(2);
  });

  it('refuses a save based on an out-of-date revision and leaves newer data untouched', async () => {
    const db = await fresh();
    await saveDb(db, new Uint8Array([1]), 0); // tab A saves (rev 1)
    await saveDb(db, new Uint8Array([2]), 1); // tab B, which loaded rev 1, saves (rev 2)
    await expect(saveDb(db, new Uint8Array([9]), 1)).rejects.toBeInstanceOf(StaleWriteError); // tab A again, still at rev 1
    const loaded = await loadDb(db);
    expect(Array.from(loaded.bytes!)).toEqual([2]);
    expect(loaded.rev).toBe(2);
  });

  it('two app instances: the stale one cannot overwrite clubs saved by the other', async () => {
    const SQL = await initSqlJs();
    const idb = await fresh();
    const open = async () => {
      const loaded = await loadDb(idb);
      let rev = loaded.rev;
      const driver = createSqlJsDriver(SQL, {
        data: loaded.bytes,
        onWrite: async (bytes) => {
          rev = await saveDb(idb, bytes, rev);
        },
      });
      let t = Date.parse('2026-10-19T09:00:00Z');
      const repos = createRepositories({ db: driver, newId: () => randomUUID(), now: () => new Date((t += 1000)), timeZone: 'UTC' });
      const ownerId = await repos.initialise();
      return { repos, ownerId };
    };

    const first = await open();
    await first.repos.clubs.create(first.ownerId, clubFields('putter', { brand: 'Example Maker A' }));

    // Both instances now load the same revision.
    const a = await open();
    const b = await open();
    await b.repos.clubs.create(b.ownerId, clubFields('iron_7', { brand: 'Example Maker B' }));
    // Instance A still holds the older copy: its save is refused instead of erasing B's 7-iron.
    await expect(a.repos.clubs.create(a.ownerId, clubFields('driver'))).rejects.toBeInstanceOf(StaleWriteError);

    const after = await open();
    const types = (await after.repos.clubs.list(after.ownerId)).map((c) => c.typeCode).sort();
    expect(types).toEqual(['iron_7', 'putter']);
  });

  it('opening the app does not write (pragmas are not saved), so an idle open tab never goes stale', async () => {
    const SQL = await initSqlJs();
    const idb = await fresh();
    let writes = 0;
    const loaded = await loadDb(idb);
    let rev = loaded.rev;
    const driver = createSqlJsDriver(SQL, {
      data: loaded.bytes,
      onWrite: async (bytes) => {
        writes++;
        rev = await saveDb(idb, bytes, rev);
      },
    });
    const repos = createRepositories({ db: driver, newId: () => randomUUID(), now: () => new Date(), timeZone: 'UTC' });
    await repos.initialise(); // first run: migrations + catalogue + owner are real writes
    const afterFirst = writes;
    await driver.exec('PRAGMA foreign_keys = ON;');
    expect(writes).toBe(afterFirst);
  });
});
