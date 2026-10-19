import { JOINTS } from '@/domain/pose/joints';
import { RawPoseFrame } from '@/domain/pose/decode';

/**
 * SYNTHETIC TEST DATA — NOT REAL DETECTION.
 * Builds pose frames in the native module's flat format for isolated logic tests of phase
 * detection, measurement and comparison. Never used by the app and never shown as analysis.
 *
 * The "golfer" stands still at address, the hands rise during the backswing, fall fast through
 * impact (back to address height), rise into the finish and then hold still.
 */
export interface SyntheticSwingOptions {
  fps: number;
  addressS?: number;
  backswingS?: number;
  downswingS?: number;
  followS?: number;
  finishS?: number;
  /** Frames (by index) in which the wrists are reported as not detected. */
  dropWristFrames?: number[];
  /** Constant nose offset added from the top onwards (normalised x), to test head movement. */
  headShiftAtTop?: number;
  bodies?: number;
}

const BASE: Record<string, [number, number]> = {
  nose: [0.5, 0.2],
  leftEye: [0.51, 0.19],
  rightEye: [0.49, 0.19],
  leftEar: [0.52, 0.2],
  rightEar: [0.48, 0.2],
  neck: [0.5, 0.3],
  leftShoulder: [0.55, 0.31],
  rightShoulder: [0.45, 0.31],
  leftElbow: [0.53, 0.45],
  rightElbow: [0.47, 0.45],
  root: [0.5, 0.55],
  leftHip: [0.53, 0.55],
  rightHip: [0.47, 0.55],
  leftKnee: [0.54, 0.72],
  rightKnee: [0.46, 0.72],
  leftAnkle: [0.55, 0.9],
  rightAnkle: [0.45, 0.9],
};

export function syntheticSwing(o: SyntheticSwingOptions): { frames: RawPoseFrame[]; expected: { address: number; top: number; impact: number; finish: number } } {
  const a = o.addressS ?? 0.6;
  const b = o.backswingS ?? 0.8;
  const d = o.downswingS ?? 0.27;
  const f = o.followS ?? 0.4;
  const h = o.finishS ?? 0.6;
  const total = a + b + d + f + h;
  const n = Math.round(total * o.fps);
  const lowY = 0.6;
  const topY = 0.15;
  const finishY = 0.2;
  const handsAt = (t: number): [number, number] => {
    if (t <= a) return [0.5, lowY];
    if (t <= a + b) {
      const u = (t - a) / b;
      const e = 0.5 - 0.5 * Math.cos(Math.PI * u); // ease in/out: still at both ends
      return [0.5 - 0.15 * e, lowY + (topY - lowY) * e];
    }
    if (t <= a + b + d) {
      const u = (t - a - b) / d;
      const e = u * u; // accelerating downswing; fastest at impact
      return [0.35 + 0.15 * e, topY + (lowY - topY) * e];
    }
    if (t <= a + b + d + f) {
      const u = (t - a - b - d) / f;
      const e = Math.sin((Math.PI / 2) * u); // fast out of impact, slowing into the finish
      return [0.5 + 0.12 * e, lowY + (finishY - lowY) * e];
    }
    return [0.62, finishY];
  };
  const frames: RawPoseFrame[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / o.fps;
    const [hx, hy] = handsAt(t);
    const p: number[] = [];
    for (const j of JOINTS) {
      let xy: [number, number] | null;
      if (j === 'leftWrist' || j === 'rightWrist') xy = o.dropWristFrames?.includes(i) ? null : [hx + (j === 'leftWrist' ? 0.01 : -0.01), hy];
      else xy = BASE[j]!;
      if (xy && j === 'nose' && o.headShiftAtTop && t >= a + b) xy = [xy[0] + o.headShiftAtTop, xy[1]];
      p.push(...(xy ? [xy[0], xy[1], 0.9] : [-1, -1, 0]));
    }
    frames.push({ t, i, n: o.bodies ?? 1, p });
  }
  return { frames, expected: { address: a, top: a + b, impact: a + b + d, finish: a + b + d + f } };
}
