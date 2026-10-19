/** Shapes returned by the native GolfVision module (see ios/Core). Values are read from the file or computed by Apple Vision. */

export interface NativeVideoInfo {
  durationSeconds: number;
  naturalWidth: number;
  naturalHeight: number;
  displayWidth: number;
  displayHeight: number;
  rotationDegrees: 0 | 90 | 180 | 270;
  mirrored: boolean;
  nominalFrameRate: number;
  minFrameDurationSeconds: number | null;
  /** duration × nominal frame rate: an estimate, not a count. */
  estimatedFrameCount: number;
  codec: string;
  fileSizeBytes: number | null;
  hasAudio: boolean;
}

/** One analysed frame: t = presentation time (s), i = decoded frame index, n = people detected, p = 19 × (x, y, confidence). */
export interface NativePoseFrame {
  t: number;
  i: number;
  n: number;
  p: number[];
}

export interface NativePoseResult {
  video: NativeVideoInfo;
  frames: NativePoseFrame[];
  decodedFrames: number;
  truncated: boolean;
  engine: 'apple_vision_body_pose_2d';
  visionRevision: number;
  jointOrder: string[];
  processingSeconds: number;
}

export interface NativeExtractedFrame {
  uri: string;
  requestedSeconds: number;
  actualSeconds: number;
  width: number;
  height: number;
}

export interface AnalyzeOptions {
  maxFramesPerSecond?: number | null;
  maxFrames?: number;
  startSeconds?: number | null;
  endSeconds?: number | null;
}

export interface AnalysisProgressEvent {
  jobId: string;
  analysed: number;
  estimatedTotal: number;
}

export type GolfVisionEvents = {
  onAnalysisProgress: (event: AnalysisProgressEvent) => void;
};
