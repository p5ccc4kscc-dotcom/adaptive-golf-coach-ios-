import { CLUB_CATALOG_VERSION, CLUB_TYPES, ClubTypeDefinition } from '@/domain/clubCatalog';

import { RepoContext, nowIso } from './context';

const LOCAL_OWNER_KEY = 'local_owner_id';
const CATALOG_VERSION_KEY = 'club_catalog_version';

/**
 * The installation's local profile owner. One private profile per install in
 * this release; every row is scoped by this owner id for future separation.
 */
export function ownerRepository(ctx: RepoContext) {
  return {
    async ensureLocalOwner(): Promise<string> {
      const existing = await ctx.db.get<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [LOCAL_OWNER_KEY]);
      if (existing) return existing.value;
      const id = ctx.newId();
      await ctx.db.transaction(async (tx) => {
        await tx.run('INSERT INTO owner (id, kind, created_at) VALUES (?, ?, ?)', [id, 'local', nowIso(ctx)]);
        await tx.run('INSERT INTO app_meta (key, value) VALUES (?, ?)', [LOCAL_OWNER_KEY, id]);
      });
      return id;
    },
  };
}

/** Generic club-type reference data, upserted when the bundled catalogue version changes. */
export function clubCatalogRepository(ctx: RepoContext) {
  return {
    async sync(types: readonly ClubTypeDefinition[] = CLUB_TYPES, version = CLUB_CATALOG_VERSION): Promise<boolean> {
      const row = await ctx.db.get<{ value: string }>('SELECT value FROM app_meta WHERE key = ?', [CATALOG_VERSION_KEY]);
      if (row && Number(row.value) >= version) return false;
      await ctx.db.transaction(async (tx) => {
        for (const t of types) {
          await tx.run(
            `INSERT INTO club_type_definition (code, category, number, label, catalog_version, sort_order, retired_at)
             VALUES (?, ?, ?, ?, ?, ?, NULL)
             ON CONFLICT(code) DO UPDATE SET category = excluded.category, number = excluded.number,
               label = excluded.label, catalog_version = excluded.catalog_version, sort_order = excluded.sort_order, retired_at = NULL`,
            [t.code, t.category, t.number, t.label, version, t.sortOrder],
          );
        }
        // Types removed from the bundle are retired, never deleted (owned clubs may reference them).
        const codes = types.map((t) => t.code);
        await tx.run(
          `UPDATE club_type_definition SET retired_at = ? WHERE retired_at IS NULL AND code NOT IN (${codes.map(() => '?').join(',')})`,
          [nowIso(ctx), ...codes],
        );
        await tx.run('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
          CATALOG_VERSION_KEY,
          String(version),
        ]);
      });
      return true;
    },
    async count(): Promise<number> {
      const r = await ctx.db.get<{ n: number }>('SELECT COUNT(*) AS n FROM club_type_definition WHERE retired_at IS NULL');
      return Number(r?.n ?? 0);
    },
  };
}
