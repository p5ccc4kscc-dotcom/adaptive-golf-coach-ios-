import { Joint } from './joints';

/** A detected joint in the upright video frame, normalised 0–1 with the origin at the top-left. */
export interface PosePoint {
  x: number;
  y: number;
  /** Vision's confidence, 0–1. */
  c: number;
}

export interface PoseFrame {
  /** Presentation time in the video, seconds. */
  t: number;
  /** Index of the decoded frame in the file. */
  index: number;
  /** People Vision found in this frame; the largest is used. */
  bodies: number;
  /** Indexed like JOINTS; null = not detected, or below the confidence threshold. */
  joints: (PosePoint | null)[];
}

export type CameraView = 'fo' | 'dtl' | 'other';

export const SHOT_TYPES = ['full', 'three_quarter', 'pitch', 'chip', 'putt', 'drill', 'other'] as const;
export type ShotType = (typeof SHOT_TYPES)[number];
export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  full: 'Full swing',
  three_quarter: 'Three-quarter',
  pitch: 'Pitch',
  chip: 'Chip',
  putt: 'Putt',
  drill: 'Drill / practice move',
  other: 'Other',
};
export const CAMERA_VIEW_LABELS: Record<CameraView, string> = { fo: 'Face-on', dtl: 'Down the line', other: 'Other angle' };

export interface VideoMeta {
  durationSeconds: number;
  displayWidth: number;
  displayHeight: number;
  rotationDegrees: number;
  nominalFrameRate: number;
  estimatedFrameCount: number;
  codec: string;
  fileSizeBytes: number | null;
}

/**
 * Where a number comes from. Shown next to every value.
 * - detected_2d: a landmark Apple Vision found in the frame.
 * - calculated_2d: arithmetic on detected landmarks, in the 2D image plane.
 * - estimated: depends on a swing-phase candidate chosen by heuristics.
 * - manual: entered by the golfer.
 * - unavailable: cannot be measured from body-pose video.
 */
export type MeasurementBasis = 'detected_2d' | 'calculated_2d' | 'estimated' | 'manual' | 'unavailable';

export const BASIS_LABELS: Record<MeasurementBasis, string> = {
  detected_2d: 'Detected (2D landmark)',
  calculated_2d: 'Calculated from 2D landmarks',
  estimated: 'Estimated from swing-phase candidates',
  manual: 'Entered by you',
  unavailable: 'Not measurable from this video',
};

export function jointAt(frame: PoseFrame, index: number): PosePoint | null {
  return frame.joints[index] ?? null;
}

export type JointSeries = Partial<Record<Joint, (PosePoint | null)[]>>;
