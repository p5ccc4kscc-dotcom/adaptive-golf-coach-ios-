import {
  BagKind,
  BagPreset,
  AddToBagCheck,
  SwapCheck,
  canBecomeCompetition,
  checkAddToBag,
  checkSwap,
  validatePresetName,
} from '@/domain/bag';
import { ClubDistanceObservation, ClubFields, ClubInstance, compareClubs } from '@/domain/clubs';

import { SqlExecutor } from '../db/driver';
import { RepoContext, nowIso } from './context';

interface ClubRow {
  id: string;
  owner_id: string;
  club_type_code: string;
  custom_name: string | null;
  custom_category: string | null;
  custom_description: string | null;
  brand: string | null;
  model: string | null;
  loft_deg: number | null;
  loft_status: ClubInstance['loftStatus'];
  length_cm: number | null;
  length_unit: string | null;
  lie_deg: number | null;
  shaft_brand: string | null;
  shaft_model: string | null;
  shaft_flex: string | null;
  shaft_material: string | null;
  grip: string | null;
  condition: string | null;
  purchase_year: number | null;
  notes: string | null;
  handedness_override: string | null;
  putter_subtype: string | null;
  status: 'active' | 'archived';
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

const num = (v: number | null) => (v === null ? null : Number(v));

export function clubFromRow(r: ClubRow): ClubInstance {
  return {
    id: r.id,
    ownerId: r.owner_id,
    typeCode: r.club_type_code,
    customName: r.custom_name,
    customCategory: r.custom_category as ClubInstance['customCategory'],
    customDescription: r.custom_description,
    brand: r.brand,
    model: r.model,
    loftDeg: num(r.loft_deg),
    loftStatus: r.loft_status,
    lengthCm: num(r.length_cm),
    lengthUnit: r.length_unit as ClubInstance['lengthUnit'],
    lieDeg: num(r.lie_deg),
    shaftBrand: r.shaft_brand,
    shaftModel: r.shaft_model,
    shaftFlex: r.shaft_flex,
    shaftMaterial: r.shaft_material,
    grip: r.grip,
    condition: r.condition,
    purchaseYear: num(r.purchase_year),
    notes: r.notes,
    handednessOverride: r.handedness_override as ClubInstance['handednessOverride'],
    putterSubtype: r.putter_subtype as ClubInstance['putterSubtype'],
    status: r.status,
    archivedAt: r.archived_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const FIELD_COLUMNS: [keyof ClubFields, string][] = [
  ['typeCode', 'club_type_code'],
  ['customName', 'custom_name'],
  ['customCategory', 'custom_category'],
  ['customDescription', 'custom_description'],
  ['brand', 'brand'],
  ['model', 'model'],
  ['loftDeg', 'loft_deg'],
  ['loftStatus', 'loft_status'],
  ['lengthCm', 'length_cm'],
  ['lengthUnit', 'length_unit'],
  ['lieDeg', 'lie_deg'],
  ['shaftBrand', 'shaft_brand'],
  ['shaftModel', 'shaft_model'],
  ['shaftFlex', 'shaft_flex'],
  ['shaftMaterial', 'shaft_material'],
  ['grip', 'grip'],
  ['condition', 'condition'],
  ['purchaseYear', 'purchase_year'],
  ['notes', 'notes'],
  ['handednessOverride', 'handedness_override'],
  ['putterSubtype', 'putter_subtype'],
];

const fieldValues = (f: ClubFields) => FIELD_COLUMNS.map(([k]) => (f[k] ?? null) as string | number | null);

async function writeRevision(ctx: RepoContext, tx: SqlExecutor, clubId: string) {
  const row = await tx.get<ClubRow>('SELECT * FROM club_instance WHERE id = ?', [clubId]);
  if (!row) return;
  await tx.run('INSERT INTO club_instance_revision (id, club_instance_id, changed_at, snapshot_json) VALUES (?, ?, ?, ?)', [
    ctx.newId(),
    clubId,
    nowIso(ctx),
    JSON.stringify(clubFromRow(row)),
  ]);
}

async function insertClub(ctx: RepoContext, tx: SqlExecutor, ownerId: string, fields: ClubFields): Promise<string> {
  const id = ctx.newId();
  const at = nowIso(ctx);
  const cols = FIELD_COLUMNS.map(([, c]) => c);
  await tx.run(
    `INSERT INTO club_instance (id, owner_id, ${cols.join(', ')}, status, archived_at, created_at, updated_at)
     VALUES (?, ?, ${cols.map(() => '?').join(', ')}, 'active', NULL, ?, ?)`,
    [id, ownerId, ...fieldValues(fields), at, at],
  );
  await writeRevision(ctx, tx, id);
  return id;
}

/** Any distance record, past bag membership or photo counts as history worth keeping. */
async function hasHistory(tx: SqlExecutor, id: string): Promise<boolean> {
  const r = await tx.get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM club_distance_observation WHERE club_instance_id = ?)
          + (SELECT COUNT(*) FROM club_bag_membership WHERE club_instance_id = ? AND removed_at IS NOT NULL)
          + (SELECT COUNT(*) FROM equipment_photo WHERE club_instance_id = ?) AS n`,
    [id, id, id],
  );
  return Number(r?.n ?? 0) > 0;
}

export type DeleteOutcome = 'deleted' | 'archived';

export function clubInventoryRepository(ctx: RepoContext) {
  const get = async (id: string) => {
    const r = await ctx.db.get<ClubRow>('SELECT * FROM club_instance WHERE id = ?', [id]);
    return r ? clubFromRow(r) : null;
  };

  return {
    get,
    async list(ownerId: string, opts: { includeArchived?: boolean } = {}): Promise<ClubInstance[]> {
      const rows = await ctx.db.all<ClubRow>(
        `SELECT * FROM club_instance WHERE owner_id = ? ${opts.includeArchived ? '' : "AND status = 'active'"}`,
        [ownerId],
      );
      return rows.map(clubFromRow).sort(compareClubs);
    },
    async listArchived(ownerId: string): Promise<ClubInstance[]> {
      const rows = await ctx.db.all<ClubRow>("SELECT * FROM club_instance WHERE owner_id = ? AND status = 'archived'", [ownerId]);
      return rows.map(clubFromRow).sort(compareClubs);
    },
    async create(ownerId: string, fields: ClubFields): Promise<ClubInstance> {
      const id = await ctx.db.transaction((tx) => insertClub(ctx, tx, ownerId, fields));
      return (await get(id))!;
    },
    /** Creates one separate club instance per chosen iron number. Never fills gaps. */
    async createIronSet(ownerId: string, numbers: number[], startingBrand: string | null, startingModel: string | null): Promise<ClubInstance[]> {
      const unique = [...new Set(numbers)].filter((n) => Number.isInteger(n) && n >= 1 && n <= 9).sort((a, b) => a - b);
      const ids = await ctx.db.transaction(async (tx) => {
        const created: string[] = [];
        for (const n of unique) {
          created.push(
            await insertClub(ctx, tx, ownerId, {
              typeCode: `iron_${n}`,
              customName: null,
              customCategory: null,
              customDescription: null,
              brand: startingBrand?.trim() || null,
              model: startingModel?.trim() || null,
              loftDeg: null,
              loftStatus: 'not_provided',
              lengthCm: null,
              lengthUnit: null,
              lieDeg: null,
              shaftBrand: null,
              shaftModel: null,
              shaftFlex: null,
              shaftMaterial: null,
              grip: null,
              condition: null,
              purchaseYear: null,
              notes: null,
              handednessOverride: null,
              putterSubtype: null,
            }),
          );
        }
        return created;
      });
      const out: ClubInstance[] = [];
      for (const id of ids) out.push((await get(id))!);
      return out;
    },
    async update(id: string, fields: ClubFields): Promise<ClubInstance> {
      await ctx.db.transaction(async (tx) => {
        const sets = FIELD_COLUMNS.map(([, c]) => `${c} = ?`).join(', ');
        await tx.run(`UPDATE club_instance SET ${sets}, updated_at = ? WHERE id = ?`, [...fieldValues(fields), nowIso(ctx), id]);
        await writeRevision(ctx, tx, id);
      });
      return (await get(id))!;
    },
    /** Copies a club's details into a new, separate instance (no history copied). */
    async duplicate(id: string): Promise<ClubInstance> {
      const club = await get(id);
      if (!club) throw new Error('Club not found');
      const fields = Object.fromEntries(FIELD_COLUMNS.map(([k]) => [k, club[k]])) as unknown as ClubFields;
      const newId = await ctx.db.transaction((tx) => insertClub(ctx, tx, club.ownerId, fields));
      return (await get(newId))!;
    },
    async hasHistory(id: string): Promise<boolean> {
      return hasHistory(ctx.db, id);
    },
    /**
     * History-safe delete: a club with any recorded history is archived (and
     * removed from every bag) so past records keep their link. A club with no
     * history is deleted outright.
     */
    async deleteOrArchive(id: string): Promise<DeleteOutcome> {
      return ctx.db.transaction(async (tx) => {
        const at = nowIso(ctx);
        if (await hasHistory(tx, id)) {
          await tx.run('UPDATE club_bag_membership SET removed_at = ? WHERE club_instance_id = ? AND removed_at IS NULL', [at, id]);
          await tx.run("UPDATE club_instance SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?", [at, at, id]);
          return 'archived';
        }
        await tx.run('DELETE FROM club_bag_membership WHERE club_instance_id = ?', [id]);
        await tx.run('DELETE FROM club_instance WHERE id = ?', [id]);
        return 'deleted';
      });
    },
    async archive(id: string): Promise<void> {
      await ctx.db.transaction(async (tx) => {
        const at = nowIso(ctx);
        await tx.run('UPDATE club_bag_membership SET removed_at = ? WHERE club_instance_id = ? AND removed_at IS NULL', [at, id]);
        await tx.run("UPDATE club_instance SET status = 'archived', archived_at = ?, updated_at = ? WHERE id = ?", [at, at, id]);
      });
    },
    async restore(id: string): Promise<void> {
      await ctx.db.run("UPDATE club_instance SET status = 'active', archived_at = NULL, updated_at = ? WHERE id = ?", [nowIso(ctx), id]);
    },
    async revisions(id: string): Promise<{ changedAt: string; snapshot: ClubInstance }[]> {
      const rows = await ctx.db.all<{ changed_at: string; snapshot_json: string }>(
        'SELECT changed_at, snapshot_json FROM club_instance_revision WHERE club_instance_id = ? ORDER BY changed_at, rowid',
        [id],
      );
      return rows.map((r) => ({ changedAt: r.changed_at, snapshot: JSON.parse(r.snapshot_json) as ClubInstance }));
    },
  };
}

interface DistanceRow {
  id: string;
  owner_id: string;
  club_instance_id: string;
  kind: ClubDistanceObservation['kind'];
  method: ClubDistanceObservation['method'];
  value_m: number;
  entered_value: number;
  entered_unit: ClubDistanceObservation['enteredUnit'];
  observed_on: string;
  source: ClubDistanceObservation['source'];
  context: ClubDistanceObservation['context'];
  sample_count: number | null;
  notes: string | null;
  created_at: string;
}

const distanceFromRow = (r: DistanceRow): ClubDistanceObservation => ({
  id: r.id,
  ownerId: r.owner_id,
  clubInstanceId: r.club_instance_id,
  kind: r.kind,
  method: r.method,
  valueM: Number(r.value_m),
  enteredValue: Number(r.entered_value),
  enteredUnit: r.entered_unit,
  observedOn: r.observed_on,
  source: r.source,
  context: r.context,
  sampleCount: num(r.sample_count),
  notes: r.notes,
  createdAt: r.created_at,
});

export function distanceRepository(ctx: RepoContext) {
  return {
    async listForClub(clubId: string): Promise<ClubDistanceObservation[]> {
      const rows = await ctx.db.all<DistanceRow>(
        'SELECT * FROM club_distance_observation WHERE club_instance_id = ? AND deleted_at IS NULL ORDER BY observed_on DESC, created_at DESC',
        [clubId],
      );
      return rows.map(distanceFromRow);
    },
    async listForOwner(ownerId: string): Promise<ClubDistanceObservation[]> {
      const rows = await ctx.db.all<DistanceRow>('SELECT * FROM club_distance_observation WHERE owner_id = ? AND deleted_at IS NULL', [ownerId]);
      return rows.map(distanceFromRow);
    },
    async add(ownerId: string, clubId: string, obs: Omit<ClubDistanceObservation, 'id' | 'ownerId' | 'clubInstanceId' | 'createdAt'>): Promise<string> {
      const id = ctx.newId();
      await ctx.db.run(
        `INSERT INTO club_distance_observation (id, owner_id, club_instance_id, kind, method, value_m, entered_value, entered_unit, observed_on, source, context, sample_count, notes, created_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        [id, ownerId, clubId, obs.kind, obs.method, obs.valueM, obs.enteredValue, obs.enteredUnit, obs.observedOn, obs.source, obs.context, obs.sampleCount, obs.notes, nowIso(ctx)],
      );
      return id;
    },
    /** Soft delete so a mistaken entry disappears from views but remains auditable. */
    async remove(id: string): Promise<void> {
      await ctx.db.run('UPDATE club_distance_observation SET deleted_at = ? WHERE id = ?', [nowIso(ctx), id]);
    },
  };
}

interface PresetRow {
  id: string;
  owner_id: string;
  name: string;
  kind: BagKind;
  is_active: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

const presetFromRow = (r: PresetRow): BagPreset => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  kind: r.kind,
  isActive: Number(r.is_active) === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  archivedAt: r.archived_at,
});

export type PresetResult = { ok: true; preset: BagPreset } | { ok: false; error: string };

export function bagPresetRepository(ctx: RepoContext) {
  const memberIds = async (tx: SqlExecutor, presetId: string) =>
    (await tx.all<{ club_instance_id: string }>('SELECT club_instance_id FROM club_bag_membership WHERE preset_id = ? AND removed_at IS NULL', [presetId])).map(
      (r) => r.club_instance_id,
    );

  const getPreset = async (id: string) => {
    const r = await ctx.db.get<PresetRow>('SELECT * FROM club_bag_preset WHERE id = ?', [id]);
    return r ? presetFromRow(r) : null;
  };

  const repo = {
    getPreset,
    async list(ownerId: string): Promise<BagPreset[]> {
      const rows = await ctx.db.all<PresetRow>('SELECT * FROM club_bag_preset WHERE owner_id = ? AND archived_at IS NULL ORDER BY created_at, rowid', [ownerId]);
      return rows.map(presetFromRow);
    },
    async getActive(ownerId: string): Promise<BagPreset | null> {
      const r = await ctx.db.get<PresetRow>('SELECT * FROM club_bag_preset WHERE owner_id = ? AND is_active = 1 AND archived_at IS NULL', [ownerId]);
      return r ? presetFromRow(r) : null;
    },
    /** Creates an empty "My Bag" competition preset if the golfer has none. Adds no clubs. */
    async ensureDefault(ownerId: string): Promise<BagPreset> {
      const active = await repo.getActive(ownerId);
      if (active) return active;
      const any = await repo.list(ownerId);
      if (any.length > 0) {
        await repo.setActive(ownerId, any[0]!.id);
        return (await getPreset(any[0]!.id))!;
      }
      const res = await repo.create(ownerId, 'My Bag', 'competition', null);
      if (!res.ok) throw new Error(res.error);
      await repo.setActive(ownerId, res.preset.id);
      return (await getPreset(res.preset.id))!;
    },
    async create(ownerId: string, name: string, kind: BagKind, copyFromPresetId: string | null): Promise<PresetResult> {
      const nameError = validatePresetName(name);
      if (nameError) return { ok: false, error: nameError };
      const id = ctx.newId();
      const at = nowIso(ctx);
      const error = await ctx.db.transaction(async (tx) => {
        const source = copyFromPresetId ? await memberIds(tx, copyFromPresetId) : [];
        if (kind === 'competition' && !canBecomeCompetition(source.length)) {
          return 'That selection has more than 14 clubs, so it can only be copied as a practice selection.';
        }
        await tx.run('INSERT INTO club_bag_preset (id, owner_id, name, kind, is_active, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 0, ?, ?, NULL)', [
          id,
          ownerId,
          name.trim(),
          kind,
          at,
          at,
        ]);
        for (const clubId of source) {
          await tx.run('INSERT INTO club_bag_membership (id, preset_id, club_instance_id, added_at, removed_at) VALUES (?, ?, ?, ?, NULL)', [ctx.newId(), id, clubId, at]);
        }
        return null;
      });
      if (error) return { ok: false, error };
      return { ok: true, preset: (await getPreset(id))! };
    },
    async setActive(ownerId: string, presetId: string): Promise<void> {
      await ctx.db.transaction(async (tx) => {
        await tx.run('UPDATE club_bag_preset SET is_active = 0 WHERE owner_id = ?', [ownerId]);
        await tx.run('UPDATE club_bag_preset SET is_active = 1, updated_at = ? WHERE id = ? AND owner_id = ?', [nowIso(ctx), presetId, ownerId]);
      });
    },
    async rename(presetId: string, name: string): Promise<string | null> {
      const err = validatePresetName(name);
      if (err) return err;
      await ctx.db.run('UPDATE club_bag_preset SET name = ?, updated_at = ? WHERE id = ?', [name.trim(), nowIso(ctx), presetId]);
      return null;
    },
    async setKind(presetId: string, kind: BagKind): Promise<string | null> {
      return ctx.db.transaction(async (tx) => {
        if (kind === 'competition' && !canBecomeCompetition((await memberIds(tx, presetId)).length)) {
          return 'Remove clubs until 14 or fewer remain before making this a competition bag.';
        }
        await tx.run('UPDATE club_bag_preset SET kind = ?, updated_at = ? WHERE id = ?', [kind, nowIso(ctx), presetId]);
        return null;
      });
    },
    /** Archives a preset (memberships kept as history). The last preset cannot be removed. */
    async archive(ownerId: string, presetId: string): Promise<string | null> {
      const presets = await repo.list(ownerId);
      if (presets.length <= 1) return 'You need at least one bag. Clear it instead.';
      const target = presets.find((p) => p.id === presetId);
      if (!target) return 'Bag not found.';
      await ctx.db.transaction(async (tx) => {
        const at = nowIso(ctx);
        await tx.run('UPDATE club_bag_membership SET removed_at = ? WHERE preset_id = ? AND removed_at IS NULL', [at, presetId]);
        await tx.run('UPDATE club_bag_preset SET archived_at = ?, is_active = 0, updated_at = ? WHERE id = ?', [at, at, presetId]);
        if (target.isActive) {
          const next = presets.find((p) => p.id !== presetId)!;
          await tx.run('UPDATE club_bag_preset SET is_active = 1 WHERE id = ?', [next.id]);
        }
      });
      return null;
    },
    async memberIds(presetId: string): Promise<string[]> {
      return memberIds(ctx.db, presetId);
    },
    async members(presetId: string): Promise<ClubInstance[]> {
      const rows = await ctx.db.all<ClubRow>(
        `SELECT c.* FROM club_bag_membership m JOIN club_instance c ON c.id = m.club_instance_id
         WHERE m.preset_id = ? AND m.removed_at IS NULL`,
        [presetId],
      );
      return rows.map(clubFromRow).sort(compareClubs);
    },
    async addClub(presetId: string, clubId: string): Promise<AddToBagCheck> {
      return ctx.db.transaction(async (tx) => {
        const preset = await tx.get<PresetRow>('SELECT * FROM club_bag_preset WHERE id = ?', [presetId]);
        const club = await tx.get<{ status: 'active' | 'archived' }>('SELECT status FROM club_instance WHERE id = ?', [clubId]);
        if (!preset || !club) throw new Error('Bag or club not found');
        const check = checkAddToBag(preset.kind, await memberIds(tx, presetId), clubId, club.status);
        if (!check.ok) return check;
        await tx.run('INSERT INTO club_bag_membership (id, preset_id, club_instance_id, added_at, removed_at) VALUES (?, ?, ?, ?, NULL)', [
          ctx.newId(),
          presetId,
          clubId,
          nowIso(ctx),
        ]);
        await tx.run('UPDATE club_bag_preset SET updated_at = ? WHERE id = ?', [nowIso(ctx), presetId]);
        return check;
      });
    },
    async removeClub(presetId: string, clubId: string): Promise<void> {
      await ctx.db.transaction(async (tx) => {
        await tx.run('UPDATE club_bag_membership SET removed_at = ? WHERE preset_id = ? AND club_instance_id = ? AND removed_at IS NULL', [nowIso(ctx), presetId, clubId]);
        await tx.run('UPDATE club_bag_preset SET updated_at = ? WHERE id = ?', [nowIso(ctx), presetId]);
      });
    },
    /** Atomic swap: works at the 14-club limit. */
    async swap(presetId: string, outId: string, inId: string): Promise<SwapCheck> {
      return ctx.db.transaction(async (tx) => {
        const club = await tx.get<{ status: 'active' | 'archived' }>('SELECT status FROM club_instance WHERE id = ?', [inId]);
        if (!club) throw new Error('Club not found');
        const check = checkSwap(await memberIds(tx, presetId), outId, inId, club.status);
        if (!check.ok) return check;
        const at = nowIso(ctx);
        await tx.run('UPDATE club_bag_membership SET removed_at = ? WHERE preset_id = ? AND club_instance_id = ? AND removed_at IS NULL', [at, presetId, outId]);
        await tx.run('INSERT INTO club_bag_membership (id, preset_id, club_instance_id, added_at, removed_at) VALUES (?, ?, ?, ?, NULL)', [ctx.newId(), presetId, inId, at]);
        await tx.run('UPDATE club_bag_preset SET updated_at = ? WHERE id = ?', [at, presetId]);
        return check;
      });
    },
    async clear(presetId: string): Promise<void> {
      await ctx.db.run('UPDATE club_bag_membership SET removed_at = ? WHERE preset_id = ? AND removed_at IS NULL', [nowIso(ctx), presetId]);
    },
    /** Membership history for a preset (including removed clubs). */
    async history(presetId: string): Promise<{ clubId: string; addedAt: string; removedAt: string | null }[]> {
      const rows = await ctx.db.all<{ club_instance_id: string; added_at: string; removed_at: string | null }>(
        'SELECT club_instance_id, added_at, removed_at FROM club_bag_membership WHERE preset_id = ? ORDER BY added_at, rowid',
        [presetId],
      );
      return rows.map((r) => ({ clubId: r.club_instance_id, addedAt: r.added_at, removedAt: r.removed_at }));
    },
  };
  return repo;
}
