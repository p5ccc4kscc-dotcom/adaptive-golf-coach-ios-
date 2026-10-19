import { BaselineRangeOutcome, ClubChoiceKind, GolfCoachNote, PlayerSkillBaseline, RangeContext } from '@/domain/baseline';

import { RepoContext, nowIso } from './context';

interface RangeRow {
  id: string;
  owner_id: string;
  observed_on: string;
  club_instance_id: string | null;
  club_choice: ClubChoiceKind;
  context: RangeContext;
  shots: number;
  successes: number | null;
  success_definition: string | null;
  notes: string | null;
  source: 'self_reported' | 'imported';
  created_at: string;
}

const rangeFromRow = (r: RangeRow): BaselineRangeOutcome => ({
  id: r.id,
  ownerId: r.owner_id,
  observedOn: r.observed_on,
  club: { kind: r.club_choice, clubInstanceId: r.club_instance_id },
  context: r.context,
  shots: Number(r.shots),
  successes: r.successes === null ? null : Number(r.successes),
  successDefinition: r.success_definition,
  notes: r.notes,
  source: r.source,
  createdAt: r.created_at,
});

export function rangeOutcomeRepository(ctx: RepoContext) {
  return {
    async list(ownerId: string): Promise<BaselineRangeOutcome[]> {
      const rows = await ctx.db.all<RangeRow>('SELECT * FROM baseline_range_outcome WHERE owner_id = ? ORDER BY observed_on DESC, created_at DESC', [ownerId]);
      return rows.map(rangeFromRow);
    },
    async add(ownerId: string, o: Omit<BaselineRangeOutcome, 'id' | 'ownerId' | 'createdAt'>): Promise<string> {
      const id = ctx.newId();
      await ctx.db.run(
        `INSERT INTO baseline_range_outcome (id, owner_id, observed_on, club_instance_id, club_choice, context, shots, successes, success_definition, notes, source, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ownerId, o.observedOn, o.club.kind === 'unknown' ? null : o.club.clubInstanceId, o.club.kind, o.context, o.shots, o.successes, o.successDefinition, o.notes, o.source, nowIso(ctx)],
      );
      return id;
    },
    async remove(id: string): Promise<void> {
      await ctx.db.run('DELETE FROM baseline_range_outcome WHERE id = ?', [id]);
    },
  };
}

interface NoteRow {
  id: string;
  owner_id: string;
  coach_name: string | null;
  noted_on: string;
  text: string;
  club_instance_id: string | null;
  source: 'self_reported' | 'coach_confirmed';
  created_at: string;
  archived_at: string | null;
}

const noteFromRow = (r: NoteRow): GolfCoachNote => ({
  id: r.id,
  ownerId: r.owner_id,
  coachName: r.coach_name,
  notedOn: r.noted_on,
  text: r.text,
  clubInstanceId: r.club_instance_id,
  source: r.source,
  createdAt: r.created_at,
  archivedAt: r.archived_at,
});

export function coachNoteRepository(ctx: RepoContext) {
  return {
    async list(ownerId: string): Promise<GolfCoachNote[]> {
      const rows = await ctx.db.all<NoteRow>('SELECT * FROM golf_coach_note WHERE owner_id = ? AND archived_at IS NULL ORDER BY noted_on DESC, created_at DESC', [ownerId]);
      return rows.map(noteFromRow);
    },
    /** Notes typed in by the golfer are recorded as self_reported, never as coach-confirmed. */
    async add(ownerId: string, note: { coachName: string | null; notedOn: string; text: string; clubInstanceId: string | null }): Promise<string> {
      const id = ctx.newId();
      await ctx.db.run(
        `INSERT INTO golf_coach_note (id, owner_id, coach_name, noted_on, text, club_instance_id, source, created_at, archived_at)
         VALUES (?, ?, ?, ?, ?, ?, 'self_reported', ?, NULL)`,
        [id, ownerId, note.coachName?.trim() || null, note.notedOn, note.text.trim(), note.clubInstanceId, nowIso(ctx)],
      );
      return id;
    },
    /** Archive (not delete) so any later evidence that cites the note keeps its reference. */
    async archive(id: string): Promise<void> {
      await ctx.db.run('UPDATE golf_coach_note SET archived_at = ? WHERE id = ?', [nowIso(ctx), id]);
    },
  };
}

interface SkillBaselineRow {
  id: string;
  owner_id: string;
  skill_id: string;
  level: number;
  context: string;
  club_instance_id: string | null;
  camera_view: 'dtl' | 'fo' | null;
  measurement_version: string;
  provenance: PlayerSkillBaseline['provenance'];
  summary_json: string;
  approved_by: string | null;
  approval_rationale: string | null;
  created_at: string;
  superseded_at: string | null;
}

/** Persisted model for M2. Approving a new baseline supersedes (never edits) the previous one. */
export function skillBaselineRepository(ctx: RepoContext) {
  const fromRow = (r: SkillBaselineRow): PlayerSkillBaseline => ({
    id: r.id,
    ownerId: r.owner_id,
    skillId: r.skill_id,
    level: Number(r.level),
    context: r.context,
    clubInstanceId: r.club_instance_id,
    cameraView: r.camera_view,
    measurementVersion: r.measurement_version,
    provenance: r.provenance,
    summary: JSON.parse(r.summary_json) as Record<string, unknown>,
    approvedBy: r.approved_by,
    approvalRationale: r.approval_rationale,
    createdAt: r.created_at,
    supersededAt: r.superseded_at,
  });
  return {
    async current(ownerId: string, skillId: string, context: string): Promise<PlayerSkillBaseline | null> {
      const r = await ctx.db.get<SkillBaselineRow>(
        'SELECT * FROM player_skill_baseline WHERE owner_id = ? AND skill_id = ? AND context = ? AND superseded_at IS NULL',
        [ownerId, skillId, context],
      );
      return r ? fromRow(r) : null;
    },
    async history(ownerId: string, skillId: string): Promise<PlayerSkillBaseline[]> {
      const rows = await ctx.db.all<SkillBaselineRow>('SELECT * FROM player_skill_baseline WHERE owner_id = ? AND skill_id = ? ORDER BY created_at, rowid', [ownerId, skillId]);
      return rows.map(fromRow);
    },
    async approve(ownerId: string, b: Omit<PlayerSkillBaseline, 'id' | 'ownerId' | 'createdAt' | 'supersededAt'>): Promise<string> {
      const id = ctx.newId();
      const at = nowIso(ctx);
      await ctx.db.transaction(async (tx) => {
        await tx.run('UPDATE player_skill_baseline SET superseded_at = ? WHERE owner_id = ? AND skill_id = ? AND context = ? AND superseded_at IS NULL', [at, ownerId, b.skillId, b.context]);
        await tx.run(
          `INSERT INTO player_skill_baseline (id, owner_id, skill_id, level, context, club_instance_id, camera_view, measurement_version, provenance, summary_json, approved_by, approval_rationale, created_at, superseded_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
          [id, ownerId, b.skillId, b.level, b.context, b.clubInstanceId, b.cameraView, b.measurementVersion, b.provenance, JSON.stringify(b.summary), b.approvedBy, b.approvalRationale, at],
        );
      });
      return id;
    },
  };
}

export type RangeOutcomeRepository = ReturnType<typeof rangeOutcomeRepository>;
export type CoachNoteRepository = ReturnType<typeof coachNoteRepository>;
export type SkillBaselineRepository = ReturnType<typeof skillBaselineRepository>;
