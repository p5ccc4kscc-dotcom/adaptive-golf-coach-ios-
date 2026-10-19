import { migrate } from '../db/migrations';
import { clubInventoryRepository, bagPresetRepository, distanceRepository } from './clubRepository';
import { RepoContext, nowIso } from './context';
import { clubCatalogRepository, ownerRepository } from './ownerRepository';
import { baselineRepository, goalRepository, onboardingRepository, preferenceRepository, profileRepository } from './profileRepository';

export type { RepoContext } from './context';

/** Tables holding the golfer's own data, in dependency order (children last). */
const OWNER_TABLES = [
  'user_preference',
  'profile_fact',
  'player_goal',
  'onboarding_progress',
  'baseline_round',
  'club_instance',
  'club_instance_revision',
  'club_distance_observation',
  'club_bag_preset',
  'club_bag_membership',
  'equipment_photo',
] as const;

export const EXPORT_FORMAT = 'adaptive-golf-coach-export';
export const EXPORT_FORMAT_VERSION = 1;

export function createRepositories(ctx: RepoContext) {
  const repos = {
    owner: ownerRepository(ctx),
    catalog: clubCatalogRepository(ctx),
    profile: profileRepository(ctx),
    preferences: preferenceRepository(ctx),
    onboarding: onboardingRepository(ctx),
    goals: goalRepository(ctx),
    baseline: baselineRepository(ctx),
    clubs: clubInventoryRepository(ctx),
    distances: distanceRepository(ctx),
    bags: bagPresetRepository(ctx),

    /** Migrates the schema, syncs reference data and returns the local owner id. Creates no golfer data. */
    async initialise(): Promise<string> {
      await migrate(ctx.db);
      await repos.catalog.sync();
      return repos.owner.ensureLocalOwner();
    },

    /** Plain JSON export of everything this owner has stored (no proprietary format). */
    async exportAll(ownerId: string): Promise<Record<string, unknown>> {
      const tables: Record<string, unknown[]> = {};
      const byOwner = ['user_preference', 'profile_fact', 'player_goal', 'onboarding_progress', 'baseline_round', 'club_instance', 'club_distance_observation', 'club_bag_preset', 'equipment_photo'];
      for (const t of byOwner) tables[t] = await ctx.db.all(`SELECT * FROM ${t} WHERE owner_id = ?`, [ownerId]);
      tables.club_instance_revision = await ctx.db.all(
        'SELECT r.* FROM club_instance_revision r JOIN club_instance c ON c.id = r.club_instance_id WHERE c.owner_id = ?',
        [ownerId],
      );
      tables.club_bag_membership = await ctx.db.all(
        'SELECT m.* FROM club_bag_membership m JOIN club_bag_preset p ON p.id = m.preset_id WHERE p.owner_id = ?',
        [ownerId],
      );
      return { format: EXPORT_FORMAT, formatVersion: EXPORT_FORMAT_VERSION, exportedAt: nowIso(ctx), ownerId, tables };
    },

    /** Deletes every record belonging to this owner. Reference data is kept. */
    async deleteAllData(ownerId: string): Promise<void> {
      await ctx.db.transaction(async (tx) => {
        await tx.run('DELETE FROM club_bag_membership WHERE preset_id IN (SELECT id FROM club_bag_preset WHERE owner_id = ?)', [ownerId]);
        await tx.run('DELETE FROM club_instance_revision WHERE club_instance_id IN (SELECT id FROM club_instance WHERE owner_id = ?)', [ownerId]);
        for (const t of ['equipment_photo', 'club_distance_observation', 'club_bag_preset', 'club_instance', 'baseline_round', 'player_goal', 'profile_fact', 'onboarding_progress', 'user_preference']) {
          await tx.run(`DELETE FROM ${t} WHERE owner_id = ?`, [ownerId]);
        }
      });
    },

    async countOwnerRows(ownerId: string): Promise<number> {
      const exported = await repos.exportAll(ownerId);
      const tables = exported.tables as Record<string, unknown[]>;
      return OWNER_TABLES.reduce((n, t) => n + (tables[t]?.length ?? 0), 0);
    },
  };
  return repos;
}

export type Repositories = ReturnType<typeof createRepositories>;
