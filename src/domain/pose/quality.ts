import { JOINT_INDEX, Joint } from './joints';
import { PoseFrame, VideoMeta } from './types';

/**
 * Video and landmark quality checks. All thresholds are ENGINEERING DEFAULTS
 * chosen for a first prototype; none has been validated against golf footage.
 * They decide what is shown as usable, never what is "correct".
 */
export type IssueSeverity = 'block' | 'warn' | 'info';

export interface QualityIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
}

export const VIDEO_LIMITS = {
  minDurationSeconds: 0.5,
  longDurationSeconds: 30,
  minFrameRate: 25,
  goodFrameRate: 60,
  minShortSidePx: 360,
} as const;

export function assessVideo(meta: VideoMeta): { ok: boolean; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  if (!(meta.durationSeconds >= VIDEO_LIMITS.minDurationSeconds)) {
    issues.push({ code: 'too_short', severity: 'block', message: 'The clip is shorter than half a second, too short for a swing.' });
  } else if (meta.durationSeconds > VIDEO_LIMITS.longDurationSeconds) {
    issues.push({ code: 'long', severity: 'warn', message: `The clip is ${Math.round(meta.durationSeconds)} s long. Only the first part is analysed; a clip of just the swing works best.` });
  }
  if (!(meta.nominalFrameRate >= VIDEO_LIMITS.minFrameRate)) {
    issues.push({ code: 'low_fps', severity: 'warn', message: `Recorded at about ${Math.round(meta.nominalFrameRate)} frames per second. Fast parts of the swing will blur and timing will be rough.` });
  } else if (meta.nominalFrameRate < VIDEO_LIMITS.goodFrameRate) {
    issues.push({ code: 'normal_fps', severity: 'info', message: `About ${Math.round(meta.nominalFrameRate)} fps. Slow motion (120 fps or more) gives finer timing.` });
  }
  const shortSide = Math.min(meta.displayWidth, meta.displayHeight);
  if (shortSide < VIDEO_LIMITS.minShortSidePx) {
    issues.push({ code: 'low_resolution', severity: 'warn', message: `Low resolution (${meta.displayWidth}×${meta.displayHeight}). Joints may be missed.` });
  }
  return { ok: !issues.some((i) => i.severity === 'block'), issues };
}

export type PoseVerdict = 'usable' | 'limited' | 'unusable';

export interface PoseQuality {
  frames: number;
  /** Share of analysed frames in which Vision found at least one person. */
  detectionRate: number;
  /** Share of frames with more than one person in view. */
  multiPersonRate: number;
  /** Share of frames in which each key joint passed the confidence threshold. */
  keyJointRates: Partial<Record<Joint, number>>;
  verdict: PoseVerdict;
  issues: QualityIssue[];
}

const KEY_JOINTS: Joint[] = ['nose', 'neck', 'leftShoulder', 'rightShoulder', 'leftWrist', 'rightWrist', 'root', 'leftHip', 'rightHip', 'leftAnkle', 'rightAnkle'];

export const POSE_LIMITS = { usableDetection: 0.8, limitedDetection: 0.5, usableWrists: 0.7, usableTrunk: 0.8, multiPersonWarn: 0.2 } as const;

export function assessPose(frames: readonly PoseFrame[]): PoseQuality {
  const n = frames.length;
  const rate = (pred: (f: PoseFrame) => boolean) => (n === 0 ? 0 : frames.filter(pred).length / n);
  const detectionRate = rate((f) => f.bodies >= 1);
  const multiPersonRate = rate((f) => f.bodies >= 2);
  const keyJointRates: Partial<Record<Joint, number>> = {};
  for (const j of KEY_JOINTS) keyJointRates[j] = rate((f) => f.joints[JOINT_INDEX[j]] !== null);

  const issues: QualityIssue[] = [];
  if (n === 0) issues.push({ code: 'no_frames', severity: 'block', message: 'No frames were analysed.' });
  if (detectionRate < POSE_LIMITS.limitedDetection) {
    issues.push({ code: 'person_not_found', severity: 'block', message: `A person was found in only ${pct(detectionRate)} of frames. Check that your whole body is in view and well lit.` });
  } else if (detectionRate < POSE_LIMITS.usableDetection) {
    issues.push({ code: 'person_intermittent', severity: 'warn', message: `A person was found in ${pct(detectionRate)} of frames; gaps are shown as missing, not filled in.` });
  }
  if (multiPersonRate > POSE_LIMITS.multiPersonWarn) {
    issues.push({ code: 'multiple_people', severity: 'warn', message: `More than one person was in view in ${pct(multiPersonRate)} of frames. The largest is tracked, which may not be you.` });
  }
  const wrists = Math.min(keyJointRates.leftWrist ?? 0, keyJointRates.rightWrist ?? 0);
  const trunk = Math.min(keyJointRates.neck ?? 0, keyJointRates.root ?? 0);
  if (n > 0 && wrists < POSE_LIMITS.usableWrists) {
    issues.push({ code: 'wrists_missing', severity: 'warn', message: `Wrists were tracked in only ${pct(wrists)} of frames, so swing phases are less certain.` });
  }
  const verdict: PoseVerdict =
    n === 0 || detectionRate < POSE_LIMITS.limitedDetection
      ? 'unusable'
      : detectionRate >= POSE_LIMITS.usableDetection && wrists >= POSE_LIMITS.usableWrists && trunk >= POSE_LIMITS.usableTrunk
        ? 'usable'
        : 'limited';
  return { frames: n, detectionRate, multiPersonRate, keyJointRates, verdict, issues };
}

export const POSE_VERDICT_LABELS: Record<PoseVerdict, string> = {
  usable: 'Tracking looks usable',
  limited: 'Tracking is patchy — treat results with care',
  unusable: 'Tracking failed — no results shown',
};

const pct = (r: number) => `${Math.round(r * 100)}%`;
