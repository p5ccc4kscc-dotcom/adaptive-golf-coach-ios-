import { PhaseResult } from './phases';
import { VideoMeta } from './types';

/**
 * Performance-aware sampling (spec §4.1): a short clip is analysed frame by
 * frame. A long or high-frame-rate clip first gets a coarse pass to find the
 * swing, then only the swing window is analysed at the full frame rate.
 */
export const SAMPLING = {
  /** Above this many frames, use two passes. */
  singlePassMaxFrames: 900,
  coarseFps: 30,
  maxFrames: 1800,
  /** Seconds kept before the address (or top) and after the finish (or impact). */
  marginBefore: 0.5,
  marginAfter: 0.6,
} as const;

export interface SamplingPlan {
  passes: 1 | 2;
  reason: string;
}

export function planSampling(meta: VideoMeta): SamplingPlan {
  if (meta.estimatedFrameCount <= SAMPLING.singlePassMaxFrames) return { passes: 1, reason: 'Every frame analysed.' };
  return { passes: 2, reason: `About ${meta.estimatedFrameCount} frames: a ${SAMPLING.coarseFps} fps pass finds the swing, then the swing is analysed at the full ${Math.round(meta.nominalFrameRate)} fps.` };
}

/** The time window to analyse in detail, from a coarse pass; null when the coarse pass found no swing. */
export function swingWindow(coarse: PhaseResult, durationSeconds: number): { startSeconds: number; endSeconds: number } | null {
  const c = coarse.candidates;
  const start = c.address?.t ?? (c.top ? c.top.t - 1.2 : null);
  const end = c.finish?.t ?? (c.impact ? c.impact.t + 1.0 : null);
  if (start === null || end === null || end <= start) return null;
  return { startSeconds: Math.max(0, start - SAMPLING.marginBefore), endSeconds: Math.min(durationSeconds, end + SAMPLING.marginAfter) };
}
