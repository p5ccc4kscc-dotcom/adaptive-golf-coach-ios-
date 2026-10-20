import { PHASES, PHASE_LABELS, PhaseMark, PhaseResult } from './phases';
import { PoseQuality } from './quality';
import { CAMERA_VIEW_LABELS, CameraView, SHOT_TYPE_LABELS, ShotType, VideoMeta } from './types';

/**
 * Plain-text summary of one analysis for physical-device testing. It records what the analyser
 * did and how the automatic phases compare with the frames the golfer marked, so inaccuracies and
 * processing time can be documented. It never contains the video, a file path or the golfer's
 * name, and it claims nothing about accuracy.
 */
export interface TestSummaryInput {
  appVersion: string | null;
  osVersion: string;
  engineVersion: string;
  video: { meta: VideoMeta; cameraView: CameraView | null; shotType: ShotType | null; playingHand: 'right' | 'left' | null; clubChosen: boolean | null };
  run: { createdAt: string; params: Record<string, unknown>; framesAnalysed: number; decodedFrames: number; truncated: boolean; processingSeconds: number | null };
  quality: PoseQuality | null;
  /** Automatic candidates (before the golfer's marks). */
  automatic: PhaseResult | null;
  marks: readonly PhaseMark[];
  /** Spacing of analysed frames, seconds. */
  frameSpacing: number | null;
  otherRuns: { status: string; errorCode: string | null }[];
}

const pct = (r: number | undefined) => (r === undefined ? '—' : `${Math.round(r * 100)}%`);

export function buildTestSummary(i: TestSummaryInput): string {
  const m = i.video.meta;
  const lines: string[] = [];
  lines.push(`BadGolfer M1a test summary · app ${i.appVersion ?? 'unknown'} · iOS ${i.osVersion} · Apple Vision ${i.engineVersion}`);
  lines.push(`Analysed ${new Date(i.run.createdAt).toISOString()}`);
  lines.push('');
  lines.push('VIDEO (read from the file)');
  lines.push(`- ${m.durationSeconds.toFixed(2)} s · ${m.nominalFrameRate.toFixed(1)} fps · ${m.displayWidth}×${m.displayHeight} (${m.displayHeight >= m.displayWidth ? 'portrait' : 'landscape'}, stored rotation ${m.rotationDegrees}°) · ${m.codec}${m.fileSizeBytes ? ` · ${(m.fileSizeBytes / 1e6).toFixed(1)} MB` : ''}`);
  lines.push(
    `- View: ${i.video.cameraView ? CAMERA_VIEW_LABELS[i.video.cameraView] : 'not set'} · shot: ${i.video.shotType ? SHOT_TYPE_LABELS[i.video.shotType] : 'not set'} · hand: ${i.video.playingHand ?? 'not set'} · club: ${i.video.clubChosen === null ? 'not set' : i.video.clubChosen ? 'chosen' : 'unknown'}`,
  );
  lines.push('');
  lines.push('PROCESSING');
  const window = i.run.params.window as { startSeconds: number; endSeconds: number } | null | undefined;
  lines.push(`- Passes: ${String(i.run.params.plan ?? '?')}${window ? ` · detailed window ${window.startSeconds.toFixed(2)}–${window.endSeconds.toFixed(2)} s` : ''}${i.run.truncated ? ' · STOPPED AT FRAME LIMIT' : ''}`);
  const speed = i.run.processingSeconds ? i.run.framesAnalysed / i.run.processingSeconds : null;
  lines.push(`- Frames analysed (last pass): ${i.run.framesAnalysed} of ${i.run.decodedFrames} decoded · time ${i.run.processingSeconds?.toFixed(1) ?? '?'} s${speed ? ` (${speed.toFixed(1)} frames/s)` : ''}`);
  if (i.frameSpacing) lines.push(`- Analysed frame spacing: ${(i.frameSpacing * 1000).toFixed(1)} ms`);
  lines.push('');
  lines.push('TRACKING');
  if (i.quality) {
    const q = i.quality;
    lines.push(`- Verdict: ${q.verdict} · person found ${pct(q.detectionRate)} · more than one person ${pct(q.multiPersonRate)}`);
    lines.push(`- Wrists ${pct(q.keyJointRates.leftWrist)}/${pct(q.keyJointRates.rightWrist)} · shoulders ${pct(q.keyJointRates.leftShoulder)}/${pct(q.keyJointRates.rightShoulder)} · hips ${pct(q.keyJointRates.leftHip)}/${pct(q.keyJointRates.rightHip)} · ankles ${pct(q.keyJointRates.leftAnkle)}/${pct(q.keyJointRates.rightAnkle)} (left/right)`);
    for (const issue of q.issues) lines.push(`- Issue: ${issue.code}`);
  } else {
    lines.push('- No quality data.');
  }
  lines.push('');
  lines.push('PHASES (automatic candidate vs your mark)');
  for (const p of PHASES) {
    const c = i.automatic?.candidates[p];
    const mark = i.marks.find((x) => x.phase === p);
    const auto = c ? `${c.t.toFixed(3)} s ±${c.uncertaintySeconds.toFixed(3)} (${c.confidence})` : `not found${i.automatic?.unavailable.find((u) => u.phase === p) ? ' — ' + i.automatic!.unavailable.find((u) => u.phase === p)!.reason : ''}`;
    let diff = '';
    if (c && mark) {
      const d = mark.t - c.t;
      diff = ` · difference ${d >= 0 ? '+' : ''}${d.toFixed(3)} s${i.frameSpacing ? ` (${Math.round(d / i.frameSpacing)} frames)` : ''}`;
    }
    lines.push(`- ${PHASE_LABELS[p]}: ${auto} · your mark: ${mark ? `${mark.t.toFixed(3)} s` : 'none'}${diff}`);
  }
  if (i.otherRuns.length) {
    lines.push('');
    lines.push(`OTHER RUNS: ${i.otherRuns.map((r) => (r.errorCode ? `${r.status} (${r.errorCode})` : r.status)).join(', ')}`);
  }
  lines.push('');
  lines.push('Observations only: this summary does not establish accuracy or any swing fault.');
  return lines.join('\n');
}
