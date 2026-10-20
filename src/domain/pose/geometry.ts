import { JOINT_INDEX, Joint } from './joints';
import { PoseFrame, PosePoint } from './types';

/** A point in display pixels (so angles and distances respect the frame's aspect ratio). */
export interface Px {
  X: number;
  Y: number;
}

export interface FrameSize {
  displayWidth: number;
  displayHeight: number;
}

export function toPx(p: PosePoint, size: FrameSize): Px {
  return { X: p.x * size.displayWidth, Y: p.y * size.displayHeight };
}

export function joint(frame: PoseFrame, j: Joint): PosePoint | null {
  return frame.joints[JOINT_INDEX[j]] ?? null;
}

export function jointPx(frame: PoseFrame, j: Joint, size: FrameSize): Px | null {
  const p = joint(frame, j);
  return p ? toPx(p, size) : null;
}

export const dist = (a: Px, b: Px) => Math.hypot(a.X - b.X, a.Y - b.Y);

/** Mid-point of both wrists; one wrist alone when the other is missing; null when neither is tracked. */
export function handsPx(frame: PoseFrame, size: FrameSize): Px | null {
  const l = jointPx(frame, 'leftWrist', size);
  const r = jointPx(frame, 'rightWrist', size);
  if (l && r) return { X: (l.X + r.X) / 2, Y: (l.Y + r.Y) / 2 };
  return l ?? r;
}

/** Neck-to-hip-centre length in pixels; used as the body scale so results don't depend on zoom. */
export function torsoPx(frame: PoseFrame, size: FrameSize): number | null {
  const n = jointPx(frame, 'neck', size);
  const r = jointPx(frame, 'root', size);
  return n && r ? dist(n, r) : null;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Angle of the line a→b from straight up in the image, in degrees: 0 = vertical, positive = leaning to image right at the top. */
export function tiltFromVerticalDeg(lower: Px, upper: Px): number {
  return (Math.atan2(upper.X - lower.X, lower.Y - upper.Y) * 180) / Math.PI;
}

/** Interior angle at b formed by a–b–c, in degrees (0–180). */
export function angleAtDeg(a: Px, b: Px, c: Px): number | null {
  const v1 = { X: a.X - b.X, Y: a.Y - b.Y };
  const v2 = { X: c.X - b.X, Y: c.Y - b.Y };
  const n1 = Math.hypot(v1.X, v1.Y);
  const n2 = Math.hypot(v2.X, v2.Y);
  if (n1 === 0 || n2 === 0) return null;
  const cos = Math.max(-1, Math.min(1, (v1.X * v2.X + v1.Y * v2.Y) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
