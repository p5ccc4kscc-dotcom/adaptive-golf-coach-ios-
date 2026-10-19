import { randomUUID } from 'node:crypto';
import initSqlJs, { SqlJsStatic } from 'sql.js';

import { createSqlJsDriver } from '@/data/db/sqljsDriver';
import { createRepositories } from '@/data/repositories';
import { emptyClubDraft, validateClubDraft, ClubFields } from '@/domain/clubs';

let SQL: SqlJsStatic | null = null;

/**
 * Opens a real SQLite database (sql.js). Pass `persisted.bytes` from a previous
 * instance to simulate quitting and relaunching the app.
 */
export async function openTestApp(persisted: { bytes: Uint8Array | null } = { bytes: null }) {
  SQL ??= await initSqlJs();
  const store = persisted;
  const db = createSqlJsDriver(SQL, {
    data: store.bytes,
    onWrite: async (bytes) => {
      store.bytes = bytes;
    },
  });
  let clock = new Date('2026-10-19T09:00:00.000Z');
  const repos = createRepositories({
    db,
    newId: () => randomUUID(),
    now: () => {
      clock = new Date(clock.getTime() + 1000);
      return clock;
    },
    timeZone: 'UTC',
  });
  const ownerId = await repos.initialise();
  return { db, repos, ownerId, store };
}

export function clubFields(typeCode: string, overrides: Partial<ReturnType<typeof emptyClubDraft>> = {}): ClubFields {
  const r = validateClubDraft({ ...emptyClubDraft(typeCode), ...overrides }, 2026);
  if (!r.ok) throw new Error(`Invalid fixture club ${typeCode}: ${JSON.stringify(r.errors)}`);
  return r.value;
}
