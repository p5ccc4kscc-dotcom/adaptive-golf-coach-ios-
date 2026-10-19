import { DistanceUnit, HeightUnit, LengthUnit } from '@/domain/units';
import { OnboardingProgress, OnboardingStep, initialProgress, isOnboardingStep } from '@/domain/onboarding';
import { BaselineRound, PROFILE_FIELD_KEYS, PlayerGoal, PlayerProfile, ProfileFieldKey, emptyProfile } from '@/domain/profile';
import { Provenance } from '@/domain/provenance';

import { RepoContext, json, nowIso } from './context';

interface FactRow {
  field_key: string;
  value_json: string | null;
  status: Provenance;
  unit: string | null;
  recorded_at: string;
  superseded_at: string | null;
}

export interface FactUpdate {
  value: unknown;
  unit?: string | null;
  /** Defaults to self_reported when a value is given, not_provided when blank. */
  status?: Exclude<Provenance, 'not_assessed'>;
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

export function profileRepository(ctx: RepoContext) {
  return {
    async getProfile(ownerId: string): Promise<PlayerProfile> {
      const rows = await ctx.db.all<FactRow>(
        'SELECT field_key, value_json, status, unit, recorded_at, superseded_at FROM profile_fact WHERE owner_id = ? AND superseded_at IS NULL',
        [ownerId],
      );
      const profile = emptyProfile() as unknown as Record<string, unknown>;
      for (const r of rows) {
        if (!(PROFILE_FIELD_KEYS as readonly string[]).includes(r.field_key)) continue;
        profile[r.field_key] = { value: json.parse(r.value_json), status: r.status, unit: r.unit, recordedAt: r.recorded_at };
      }
      return profile as unknown as PlayerProfile;
    },

    /**
     * Records new facts. Unchanged fields are not rewritten; changed fields
     * supersede (not overwrite) the previous fact so history is kept.
     */
    async setFacts(ownerId: string, updates: Partial<Record<ProfileFieldKey, FactUpdate>>): Promise<number> {
      const at = nowIso(ctx);
      let written = 0;
      await ctx.db.transaction(async (tx) => {
        for (const [key, update] of Object.entries(updates) as [ProfileFieldKey, FactUpdate][]) {
          if (!update) continue;
          const blank = isBlank(update.value);
          const valueJson = blank ? null : json.stringify(typeof update.value === 'string' ? update.value.trim() : update.value);
          const status: Provenance = update.status ?? (blank ? 'not_provided' : 'self_reported');
          const unit = blank ? null : (update.unit ?? null);
          const current = await tx.get<FactRow>(
            'SELECT field_key, value_json, status, unit, recorded_at, superseded_at FROM profile_fact WHERE owner_id = ? AND field_key = ? AND superseded_at IS NULL',
            [ownerId, key],
          );
          if (current && current.value_json === valueJson && current.status === status && current.unit === unit) continue;
          // A first blank answer is still written, as not_provided: it was asked.
          if (current) {
            await tx.run('UPDATE profile_fact SET superseded_at = ? WHERE owner_id = ? AND field_key = ? AND superseded_at IS NULL', [at, ownerId, key]);
          }
          await tx.run(
            'INSERT INTO profile_fact (id, owner_id, field_key, value_json, status, unit, recorded_at, superseded_at) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)',
            [ctx.newId(), ownerId, key, valueJson, status, unit, at],
          );
          written++;
        }
      });
      return written;
    },

    async factHistory(ownerId: string, key: ProfileFieldKey) {
      const rows = await ctx.db.all<FactRow>(
        'SELECT field_key, value_json, status, unit, recorded_at, superseded_at FROM profile_fact WHERE owner_id = ? AND field_key = ? ORDER BY recorded_at, rowid',
        [ownerId, key],
      );
      return rows.map((r) => ({ value: json.parse(r.value_json), status: r.status, unit: r.unit, recordedAt: r.recorded_at, supersededAt: r.superseded_at }));
    },
  };
}

interface ProgressRow {
  owner_id: string;
  status: OnboardingProgress['status'];
  current_step: string;
  completed_steps_json: string;
  skipped_steps_json: string;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
}

export function onboardingRepository(ctx: RepoContext) {
  return {
    async get(ownerId: string): Promise<OnboardingProgress> {
      const r = await ctx.db.get<ProgressRow>('SELECT * FROM onboarding_progress WHERE owner_id = ?', [ownerId]);
      if (!r) return initialProgress(ownerId);
      const steps = (s: string) => (json.parse<string[]>(s) ?? []).filter(isOnboardingStep) as OnboardingStep[];
      return {
        ownerId,
        status: r.status,
        currentStep: isOnboardingStep(r.current_step) ? r.current_step : 'welcome',
        completedSteps: steps(r.completed_steps_json),
        skippedSteps: steps(r.skipped_steps_json),
        startedAt: r.started_at,
        updatedAt: r.updated_at,
        completedAt: r.completed_at,
      };
    },
    async save(p: OnboardingProgress): Promise<void> {
      await ctx.db.run(
        `INSERT INTO onboarding_progress (owner_id, status, current_step, completed_steps_json, skipped_steps_json, started_at, updated_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(owner_id) DO UPDATE SET status = excluded.status, current_step = excluded.current_step,
           completed_steps_json = excluded.completed_steps_json, skipped_steps_json = excluded.skipped_steps_json,
           started_at = excluded.started_at, updated_at = excluded.updated_at, completed_at = excluded.completed_at`,
        [p.ownerId, p.status, p.currentStep, JSON.stringify(p.completedSteps), JSON.stringify(p.skippedSteps), p.startedAt, p.updatedAt, p.completedAt],
      );
    },
  };
}

interface GoalRow {
  id: string;
  owner_id: string;
  text: string;
  measurable_definition: string | null;
  priority: number;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

const goalFromRow = (r: GoalRow): PlayerGoal => ({
  id: r.id,
  ownerId: r.owner_id,
  text: r.text,
  measurableDefinition: r.measurable_definition,
  priority: Number(r.priority),
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export function goalRepository(ctx: RepoContext) {
  const list = async (ownerId: string) =>
    (await ctx.db.all<GoalRow>("SELECT * FROM player_goal WHERE owner_id = ? AND status = 'active' ORDER BY priority, created_at", [ownerId])).map(goalFromRow);
  return {
    list,
    async add(ownerId: string, text: string, measurableDefinition: string | null): Promise<PlayerGoal> {
      const at = nowIso(ctx);
      const max = await ctx.db.get<{ p: number | null }>("SELECT MAX(priority) AS p FROM player_goal WHERE owner_id = ? AND status = 'active'", [ownerId]);
      const id = ctx.newId();
      await ctx.db.run(
        "INSERT INTO player_goal (id, owner_id, text, measurable_definition, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)",
        [id, ownerId, text.trim(), measurableDefinition?.trim() || null, Number(max?.p ?? 0) + 1, at, at],
      );
      return (await list(ownerId)).find((g) => g.id === id)!;
    },
    async archive(id: string): Promise<void> {
      await ctx.db.run("UPDATE player_goal SET status = 'archived', updated_at = ? WHERE id = ?", [nowIso(ctx), id]);
    },
    /** Moves a goal up (-1) or down (+1) in priority. */
    async move(ownerId: string, id: string, delta: -1 | 1): Promise<void> {
      const goals = await list(ownerId);
      const i = goals.findIndex((g) => g.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= goals.length) return;
      const reordered = [...goals];
      [reordered[i], reordered[j]] = [reordered[j]!, reordered[i]!];
      await ctx.db.transaction(async (tx) => {
        for (let k = 0; k < reordered.length; k++) {
          await tx.run('UPDATE player_goal SET priority = ?, updated_at = ? WHERE id = ?', [k + 1, nowIso(ctx), reordered[k]!.id]);
        }
      });
    },
  };
}

interface BaselineRow {
  id: string;
  owner_id: string;
  played_on: string;
  holes: number;
  total_strokes: number | null;
  total_putts: number | null;
  course_name: string | null;
  source: 'self_reported' | 'imported';
  notes: string | null;
  created_at: string;
}

export function baselineRepository(ctx: RepoContext) {
  return {
    async list(ownerId: string): Promise<BaselineRound[]> {
      const rows = await ctx.db.all<BaselineRow>('SELECT * FROM baseline_round WHERE owner_id = ? ORDER BY played_on DESC, created_at DESC', [ownerId]);
      return rows.map((r) => ({
        id: r.id,
        ownerId: r.owner_id,
        playedOn: r.played_on,
        holes: Number(r.holes) as 9 | 18,
        totalStrokes: r.total_strokes === null ? null : Number(r.total_strokes),
        totalPutts: r.total_putts === null ? null : Number(r.total_putts),
        courseName: r.course_name,
        source: r.source,
        notes: r.notes,
        createdAt: r.created_at,
      }));
    },
    async add(ownerId: string, round: Omit<BaselineRound, 'id' | 'ownerId' | 'createdAt'>): Promise<string> {
      const id = ctx.newId();
      await ctx.db.run(
        'INSERT INTO baseline_round (id, owner_id, played_on, holes, total_strokes, total_putts, course_name, source, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, ownerId, round.playedOn, round.holes, round.totalStrokes, round.totalPutts, round.courseName, round.source, round.notes, nowIso(ctx)],
      );
      return id;
    },
    async remove(id: string): Promise<void> {
      await ctx.db.run('DELETE FROM baseline_round WHERE id = ?', [id]);
    },
  };
}

export interface UnitPreferences {
  distanceUnit: DistanceUnit;
  clubLengthUnit: LengthUnit;
  heightUnit: HeightUnit;
  /** False until the golfer has seen and confirmed (or changed) the unit choice. */
  confirmed: boolean;
}

export function preferenceRepository(ctx: RepoContext) {
  return {
    /** Stored preferences, falling back to the supplied locale-derived defaults. */
    async getUnits(ownerId: string, localeDefaults: Omit<UnitPreferences, 'confirmed'>): Promise<UnitPreferences> {
      const rows = await ctx.db.all<{ key: string; value: string }>('SELECT key, value FROM user_preference WHERE owner_id = ?', [ownerId]);
      const map = new Map(rows.map((r) => [r.key, r.value]));
      const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
        const v = map.get(key);
        return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
      };
      return {
        distanceUnit: pick('distanceUnit', ['yards', 'metres'] as const, localeDefaults.distanceUnit),
        clubLengthUnit: pick('clubLengthUnit', ['in', 'cm'] as const, localeDefaults.clubLengthUnit),
        heightUnit: pick('heightUnit', ['cm', 'ft_in'] as const, localeDefaults.heightUnit),
        confirmed: map.get('unitsConfirmed') === 'true',
      };
    },
    async setUnits(ownerId: string, units: Omit<UnitPreferences, 'confirmed'>): Promise<void> {
      const at = nowIso(ctx);
      await ctx.db.transaction(async (tx) => {
        const entries: [string, string][] = [
          ['distanceUnit', units.distanceUnit],
          ['clubLengthUnit', units.clubLengthUnit],
          ['heightUnit', units.heightUnit],
          ['unitsConfirmed', 'true'],
        ];
        for (const [key, value] of entries) {
          await tx.run(
            'INSERT INTO user_preference (owner_id, key, value, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(owner_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
            [ownerId, key, value, at],
          );
        }
      });
    },
  };
}
