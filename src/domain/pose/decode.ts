import { JOINTS } from './joints';
import { PoseFrame } from './types';

/** Confidence below which a joint is treated as not detected. An engineering default, not a validated threshold. */
export const DEFAULT_MIN_CONFIDENCE = 0.3;

export interface RawPoseFrame {
  t: number;
  i: number;
  n: number;
  p: number[];
}

/**
 * Turns the native module's flat arrays into frames. Joints Vision did not find,
 * or found with confidence below `minConfidence`, become null. Nothing is
 * interpolated, smoothed or invented.
 */
export function decodeFrames(raw: readonly RawPoseFrame[], minConfidence = DEFAULT_MIN_CONFIDENCE): PoseFrame[] {
  return raw
    .map((f) => ({
      t: f.t,
      index: f.i,
      bodies: f.n,
      joints: JOINTS.map((_, j) => {
        const x = f.p[j * 3];
        const y = f.p[j * 3 + 1];
        const c = f.p[j * 3 + 2];
        if (x === undefined || y === undefined || c === undefined) return null;
        if (c < minConfidence || c <= 0 || x < 0 || y < 0 || x > 1 || y > 1) return null;
        return { x, y, c };
      }),
    }))
    .sort((a, b) => a.t - b.t);
}

/** Rounds raw arrays for storage (4 decimals ≈ 0.1 px on a 1080p frame). Values stay exactly as detected otherwise. */
export function compactRaw(raw: readonly RawPoseFrame[]): RawPoseFrame[] {
  const r = (v: number) => Math.round(v * 10000) / 10000;
  return raw.map((f) => ({ t: Math.round(f.t * 1e6) / 1e6, i: f.i, n: f.n, p: f.p.map(r) }));
}
