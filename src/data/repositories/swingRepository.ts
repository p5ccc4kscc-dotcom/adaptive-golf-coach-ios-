import { ClubChoiceKind } from '@/domain/baseline';
import { RawPoseFrame, compactRaw } from '@/domain/pose/decode';
import { PhaseMark, PhaseResult } from '@/domain/pose/phases';
import { PoseQuality } from '@/domain/pose/quality';
import { CameraView, ShotType, VideoMeta } from '@/domain/pose/types';

import { RepoContext, json, nowIso } from './context';

export interface SwingVideo {
  id: string;
  ownerId: string;
  /** Relative to the app's documents folder (resolve with the service before use). */
  relativePath: string;
  originalFileName: string | null;
  importedAt: string;
  recordedOn: string | null;
  meta: VideoMeta;
  cameraView: CameraView | null;
  playingHand: 'right' | 'left' | null;
  /** null = not chosen yet. */
  clubChoice: ClubChoiceKind | null;
  clubInstanceId: string | null;
  shotType: ShotType | null;
  notes: string | null;
  archivedAt: string | null;
}

export type AnalysisStatus = 'completed' | 'failed' | 'cancelled';

export interface PoseAnalysisRecord {
  id: string;
  swingVideoId: string;
  createdAt: string;
  engine: string;
  engineVersion: string;
  appVersion: string | null;
  params: Record<string, unknown>;
  status: AnalysisStatus;
  errorCode: string | null;
  errorMessage: string | null;
  framesAnalysed: number;
  decodedFrames: number;
  truncated: boolean;
  processingSeconds: number | null;
  quality: PoseQuality | null;
  phases: PhaseResult | null;
}

interface VideoRow {
  id: string;
  owner_id: string;
  relative_path: string;
  original_file_name: string | null;
  imported_at: string;
  recorded_on: string | null;
  duration_s: number;
  display_width: number;
  display_height: number;
  rotation_deg: number;
  nominal_fps: number;
  estimated_frame_count: number;
  codec: string;
  file_size_bytes: number | null;
  camera_view: CameraView | null;
  playing_hand: 'right' | 'left' | null;
  club_choice: ClubChoiceKind | null;
  club_instance_id: string | null;
  shot_type: ShotType | null;
  notes: string | null;
  archived_at: string | null;
}

const videoFromRow = (r: VideoRow): SwingVideo => ({
  id: r.id,
  ownerId: r.owner_id,
  relativePath: r.relative_path,
  originalFileName: r.original_file_name,
  importedAt: r.imported_at,
  recordedOn: r.recorded_on,
  meta: {
    durationSeconds: Number(r.duration_s),
    displayWidth: Number(r.display_width),
    displayHeight: Number(r.display_height),
    rotationDegrees: Number(r.rotation_deg),
    nominalFrameRate: Number(r.nominal_fps),
    estimatedFrameCount: Number(r.estimated_frame_count),
    codec: r.codec,
    fileSizeBytes: r.file_size_bytes === null ? null : Number(r.file_size_bytes),
  },
  cameraView: r.camera_view,
  playingHand: r.playing_hand,
  clubChoice: r.club_choice,
  clubInstanceId: r.club_instance_id,
  shotType: r.shot_type,
  notes: r.notes,
  archivedAt: r.archived_at,
});

interface AnalysisRow {
  id: string;
  swing_video_id: string;
  created_at: string;
  engine: string;
  engine_version: string;
  app_version: string | null;
  params_json: string;
  status: AnalysisStatus;
  error_code: string | null;
  error_message: string | null;
  frames_analysed: number;
  decoded_frames: number;
  truncated: number;
  processing_s: number | null;
  quality_json: string | null;
  phases_json: string | null;
}

const analysisFromRow = (r: AnalysisRow): PoseAnalysisRecord => ({
  id: r.id,
  swingVideoId: r.swing_video_id,
  createdAt: r.created_at,
  engine: r.engine,
  engineVersion: r.engine_version,
  appVersion: r.app_version,
  params: json.parse<Record<string, unknown>>(r.params_json) ?? {},
  status: r.status,
  errorCode: r.error_code,
  errorMessage: r.error_message,
  framesAnalysed: Number(r.frames_analysed),
  decodedFrames: Number(r.decoded_frames),
  truncated: Number(r.truncated) === 1,
  processingSeconds: r.processing_s === null ? null : Number(r.processing_s),
  quality: json.parse<PoseQuality>(r.quality_json),
  phases: json.parse<PhaseResult>(r.phases_json),
});

export const POSE_FRAME_FORMAT_VERSION = 1;

export function swingVideoRepository(ctx: RepoContext) {
  return {
    async add(
      ownerId: string,
      v: { relativePath: string; originalFileName: string | null; meta: VideoMeta; cameraView: CameraView | null; playingHand: 'right' | 'left' | null; clubInstanceId: string | null; recordedOn: string | null },
    ): Promise<string> {
      const id = ctx.newId();
      const m = v.meta;
      await ctx.db.run(
        `INSERT INTO swing_video (id, owner_id, relative_path, original_file_name, source, imported_at, recorded_on, duration_s, display_width, display_height,
           rotation_deg, nominal_fps, estimated_frame_count, codec, file_size_bytes, camera_view, playing_hand, club_instance_id)
         VALUES (?, ?, ?, ?, 'photos_import', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, ownerId, v.relativePath, v.originalFileName, nowIso(ctx), v.recordedOn, m.durationSeconds, m.displayWidth, m.displayHeight, m.rotationDegrees, m.nominalFrameRate, m.estimatedFrameCount, m.codec, m.fileSizeBytes, v.cameraView, v.playingHand, v.clubInstanceId],
      );
      return id;
    },
    async list(ownerId: string): Promise<SwingVideo[]> {
      const rows = await ctx.db.all<VideoRow>('SELECT * FROM swing_video WHERE owner_id = ? AND archived_at IS NULL ORDER BY imported_at DESC', [ownerId]);
      return rows.map(videoFromRow);
    },
    async get(id: string): Promise<SwingVideo | null> {
      const r = await ctx.db.get<VideoRow>('SELECT * FROM swing_video WHERE id = ?', [id]);
      return r ? videoFromRow(r) : null;
    },
    /** Golfer-entered context only; file metadata is never edited. */
    async updateContext(
      id: string,
      patch: { cameraView?: CameraView | null; playingHand?: 'right' | 'left' | null; club?: { kind: ClubChoiceKind; clubInstanceId: string | null } | null; shotType?: ShotType | null; notes?: string | null },
    ): Promise<void> {
      if ('cameraView' in patch) await ctx.db.run('UPDATE swing_video SET camera_view = ? WHERE id = ?', [patch.cameraView ?? null, id]);
      if ('playingHand' in patch) await ctx.db.run('UPDATE swing_video SET playing_hand = ? WHERE id = ?', [patch.playingHand ?? null, id]);
      if ('shotType' in patch) await ctx.db.run('UPDATE swing_video SET shot_type = ? WHERE id = ?', [patch.shotType ?? null, id]);
      if ('notes' in patch) await ctx.db.run('UPDATE swing_video SET notes = ? WHERE id = ?', [patch.notes ?? null, id]);
      if ('club' in patch) {
        const c = patch.club ?? null;
        await ctx.db.run('UPDATE swing_video SET club_choice = ?, club_instance_id = ? WHERE id = ?', [c?.kind ?? null, c && c.kind !== 'unknown' ? c.clubInstanceId : null, id]);
      }
    },
    /** Hides the video; its file and analyses are kept. */
    async archive(id: string): Promise<void> {
      await ctx.db.run('UPDATE swing_video SET archived_at = ? WHERE id = ?', [nowIso(ctx), id]);
    },
  };
}

export function poseAnalysisRepository(ctx: RepoContext) {
  return {
    /** Records a run. Completed runs store their frames; failed and cancelled runs are kept as history. */
    async add(
      ownerId: string,
      a: {
        swingVideoId: string;
        engine: string;
        engineVersion: string;
        appVersion: string | null;
        params: Record<string, unknown>;
        status: AnalysisStatus;
        errorCode?: string | null;
        errorMessage?: string | null;
        decodedFrames?: number;
        truncated?: boolean;
        processingSeconds?: number | null;
        quality?: PoseQuality | null;
        phases?: PhaseResult | null;
        rawFrames?: readonly RawPoseFrame[];
        jointOrder?: readonly string[];
      },
    ): Promise<string> {
      const id = ctx.newId();
      await ctx.db.transaction(async (tx) => {
        await tx.run(
          `INSERT INTO pose_analysis (id, owner_id, swing_video_id, created_at, engine, engine_version, app_version, params_json, status, error_code, error_message,
             frames_analysed, decoded_frames, truncated, processing_s, quality_json, phases_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            ownerId,
            a.swingVideoId,
            nowIso(ctx),
            a.engine,
            a.engineVersion,
            a.appVersion,
            JSON.stringify(a.params),
            a.status,
            a.errorCode ?? null,
            a.errorMessage ?? null,
            a.rawFrames?.length ?? 0,
            a.decodedFrames ?? 0,
            a.truncated ? 1 : 0,
            a.processingSeconds ?? null,
            json.stringify(a.quality ?? null),
            json.stringify(a.phases ?? null),
          ],
        );
        if (a.status === 'completed' && a.rawFrames) {
          await tx.run('INSERT INTO pose_frame_data (pose_analysis_id, owner_id, format_version, joint_order_json, frames_json) VALUES (?, ?, ?, ?, ?)', [
            id,
            ownerId,
            POSE_FRAME_FORMAT_VERSION,
            JSON.stringify(a.jointOrder ?? []),
            JSON.stringify(compactRaw(a.rawFrames)),
          ]);
        }
      });
      return id;
    },
    async listForVideo(videoId: string): Promise<PoseAnalysisRecord[]> {
      const rows = await ctx.db.all<AnalysisRow>('SELECT * FROM pose_analysis WHERE swing_video_id = ? ORDER BY created_at DESC', [videoId]);
      return rows.map(analysisFromRow);
    },
    async latestCompleted(videoId: string): Promise<PoseAnalysisRecord | null> {
      const r = await ctx.db.get<AnalysisRow>("SELECT * FROM pose_analysis WHERE swing_video_id = ? AND status = 'completed' ORDER BY created_at DESC LIMIT 1", [videoId]);
      return r ? analysisFromRow(r) : null;
    },
    /** The golfer's current marks (latest per phase). Earlier marks stay in the table, superseded. */
    async phaseMarks(analysisId: string): Promise<PhaseMark[]> {
      const rows = await ctx.db.all<{ phase: PhaseMark['phase']; frame_index: number; time_s: number }>(
        'SELECT phase, frame_index, time_s FROM pose_phase_mark WHERE pose_analysis_id = ? AND superseded_at IS NULL',
        [analysisId],
      );
      return rows.map((r) => ({ phase: r.phase, frame: Number(r.frame_index), t: Number(r.time_s) }));
    },
    async markPhase(ownerId: string, analysisId: string, mark: PhaseMark): Promise<void> {
      await ctx.db.transaction(async (tx) => {
        const now = nowIso(ctx);
        await tx.run('UPDATE pose_phase_mark SET superseded_at = ? WHERE pose_analysis_id = ? AND phase = ? AND superseded_at IS NULL', [now, analysisId, mark.phase]);
        await tx.run('INSERT INTO pose_phase_mark (id, owner_id, pose_analysis_id, phase, frame_index, time_s, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [ctx.newId(), ownerId, analysisId, mark.phase, mark.frame, mark.t, now]);
      });
    },
    /** Returns a phase to the automatic candidate (the mark is superseded, not deleted). */
    async clearPhaseMark(analysisId: string, phase: PhaseMark['phase']): Promise<void> {
      await ctx.db.run('UPDATE pose_phase_mark SET superseded_at = ? WHERE pose_analysis_id = ? AND phase = ? AND superseded_at IS NULL', [nowIso(ctx), analysisId, phase]);
    },
    async frames(analysisId: string): Promise<{ jointOrder: string[]; frames: RawPoseFrame[] } | null> {
      const r = await ctx.db.get<{ joint_order_json: string; frames_json: string }>('SELECT joint_order_json, frames_json FROM pose_frame_data WHERE pose_analysis_id = ?', [analysisId]);
      return r ? { jointOrder: JSON.parse(r.joint_order_json) as string[], frames: JSON.parse(r.frames_json) as RawPoseFrame[] } : null;
    },
  };
}
