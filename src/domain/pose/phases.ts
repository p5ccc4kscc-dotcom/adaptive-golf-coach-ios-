import { FrameSize, Px, dist, handsPx, median, torsoPx } from './geometry';
import { PoseFrame } from './types';

/**
 * Candidate swing phases from the hands' path (mid-point of the wrists).
 *
 * Heuristic, unvalidated, and reported as such:
 * - impact candidate: the lowest hand position close to the fastest hand movement;
 * - top candidate: the highest hand position in the 1.5 s before the fastest movement;
 * - address candidate: the end of the last still period before the top (takeaway starts);
 * - finish candidate: the start of the first still period after impact.
 *
 * Works the same for face-on and down-the-line clips and for either hand,
 * because it uses only up/down position and speed. Confidence is never
 * "high": these are candidates for the golfer to check against the video.
 */
export type PhaseName = 'address' | 'top' | 'impact' | 'finish';
export const PHASES: readonly PhaseName[] = ['address', 'top', 'impact', 'finish'];
export const PHASE_LABELS: Record<PhaseName, string> = { address: 'Address', top: 'Top of backswing', impact: 'Impact', finish: 'Finish' };

export interface PhaseCandidate {
  phase: PhaseName;
  /** Index into the analysed frames. */
  frame: number;
  t: number;
  /** ± seconds: the spacing of analysed frames (more across tracking gaps), plus a method margin for address and finish. */
  uncertaintySeconds: number;
  /** 'manual' = marked by the golfer on this frame; automatic candidates are never 'high'. */
  confidence: 'low' | 'medium' | 'manual';
}

/** A phase the golfer set by hand on a specific analysed frame. */
export interface PhaseMark {
  phase: PhaseName;
  frame: number;
  t: number;
}

/**
 * Golfer marks replace the automatic candidates for those phases. The
 * uncertainty of a mark is one frame spacing (the golfer picked a frame).
 */
export function applyPhaseMarks(result: PhaseResult, marks: readonly PhaseMark[], frames: readonly { t: number }[]): PhaseResult {
  if (marks.length === 0) return result;
  const spacing = frames.length > 1 ? (frames[frames.length - 1]!.t - frames[0]!.t) / (frames.length - 1) : 0;
  const candidates = { ...result.candidates };
  for (const m of marks) candidates[m.phase] = { phase: m.phase, frame: m.frame, t: m.t, uncertaintySeconds: spacing, confidence: 'manual' };
  const marked = new Set(marks.map((m) => m.phase));
  return { candidates, unavailable: result.unavailable.filter((u) => !marked.has(u.phase)), notes: result.notes };
}

export interface PhaseResult {
  candidates: Partial<Record<PhaseName, PhaseCandidate>>;
  unavailable: { phase: PhaseName; reason: string }[];
  notes: string[];
}

export const PHASE_LIMITS = {
  minFrames: 10,
  minHandCoverage: 0.6,
  /** Torso lengths per second. */
  minPeakSpeed: 2,
  stillSpeed: 1,
  stillSeconds: 0.2,
  finishStillSeconds: 0.25,
  topSearchSeconds: 1.5,
  impactAfterPeakSeconds: 0.15,
  /** Frame spacing at or below this counts as "fine" timing. */
  fineSpacingSeconds: 1 / 55,
  /**
   * Added to the sampling uncertainty for the stillness-based phases. On the synthetic test
   * swing the address candidate lags the takeaway by about 0.07 s and the finish comes about
   * 0.04 s early. The error on real swings has not been measured yet.
   */
  methodMarginSeconds: { address: 0.1, top: 0, impact: 0, finish: 0.1 } as Record<'address' | 'top' | 'impact' | 'finish', number>,
} as const;

interface Sample {
  frame: number;
  t: number;
  hands: Px;
}

export function detectPhases(frames: readonly PoseFrame[], size: FrameSize): PhaseResult {
  const unavailableAll = (reason: string): PhaseResult => ({ candidates: {}, unavailable: PHASES.map((phase) => ({ phase, reason })), notes: [] });
  if (frames.length < PHASE_LIMITS.minFrames) return unavailableAll(`Only ${frames.length} frames were analysed; at least ${PHASE_LIMITS.minFrames} are needed.`);

  const samples: Sample[] = [];
  frames.forEach((f, i) => {
    const h = handsPx(f, size);
    if (h) samples.push({ frame: i, t: f.t, hands: h });
  });
  const coverage = samples.length / frames.length;
  if (coverage < PHASE_LIMITS.minHandCoverage) {
    return unavailableAll(`The hands were tracked in only ${Math.round(coverage * 100)}% of frames.`);
  }
  const torso = median(frames.map((f) => torsoPx(f, size)).filter((v): v is number => v !== null && v > 0));
  if (!torso) return unavailableAll('The neck and hips were not tracked, so there is no body scale.');

  const spacing = median(frames.slice(1).map((f, i) => f.t - frames[i]!.t)) ?? 0;
  const maxStep = Math.max(spacing * 4, 0.05);
  // Speed of the hands arriving at sample k (torso lengths per second); null across tracking gaps.
  const speed: (number | null)[] = samples.map((s, k) => {
    if (k === 0) return null;
    const p = samples[k - 1]!;
    const dt = s.t - p.t;
    return dt > 0 && dt <= maxStep ? dist(s.hands, p.hands) / torso / dt : null;
  });

  let peak = -1;
  speed.forEach((v, k) => {
    if (v !== null && (peak < 0 || v > speed[peak]!)) peak = k;
  });
  if (peak < 0 || speed[peak]! < PHASE_LIMITS.minPeakSpeed) {
    return unavailableAll('No fast hand movement was found. Does the clip contain a full swing?');
  }
  const peakT = samples[peak]!.t;
  const notes: string[] = [];
  const unavailable: PhaseResult['unavailable'] = [];
  const candidates: PhaseResult['candidates'] = {};

  const uncertaintyAt = (k: number) => {
    const before = k > 0 ? samples[k]!.t - samples[k - 1]!.t : spacing;
    const after = k < samples.length - 1 ? samples[k + 1]!.t - samples[k]!.t : spacing;
    return Math.max(spacing, Math.min(before, after));
  };
  const make = (phase: PhaseName, k: number): PhaseCandidate => {
    const u = uncertaintyAt(k) + PHASE_LIMITS.methodMarginSeconds[phase];
    return { phase, frame: samples[k]!.frame, t: samples[k]!.t, uncertaintySeconds: u, confidence: uncertaintyAt(k) <= PHASE_LIMITS.fineSpacingSeconds && coverage >= 0.9 ? 'medium' : 'low' };
  };

  // Top: highest hands (smallest Y) in the window before the peak.
  let top = -1;
  for (let k = 0; k <= peak; k++) {
    if (samples[k]!.t < peakT - PHASE_LIMITS.topSearchSeconds) continue;
    if (top < 0 || samples[k]!.hands.Y < samples[top]!.hands.Y) top = k;
  }
  if (top < 0 || top === peak) {
    unavailable.push({ phase: 'top', reason: 'No backswing was found before the fastest movement.' });
  } else {
    candidates.top = make('top', top);
  }

  // Impact: lowest hands (largest Y) between the top and just after the peak.
  if (candidates.top) {
    let impact = -1;
    for (let k = top + 1; k < samples.length && samples[k]!.t <= peakT + PHASE_LIMITS.impactAfterPeakSeconds; k++) {
      if (impact < 0 || samples[k]!.hands.Y > samples[impact]!.hands.Y) impact = k;
    }
    if (impact < 0) unavailable.push({ phase: 'impact', reason: 'The downswing was not tracked.' });
    else candidates.impact = make('impact', impact);
  } else {
    unavailable.push({ phase: 'impact', reason: 'Needs a top-of-backswing candidate first.' });
  }

  const isStill = (k: number) => speed[k] !== null && speed[k]! < PHASE_LIMITS.stillSpeed;
  /** Hands still for `seconds` up to and including sample `endK`. */
  const stillUntil = (endK: number, seconds: number) => {
    for (let k = endK; k >= 1; k--) {
      if (!isStill(k)) return false;
      if (samples[endK]!.t - samples[k - 1]!.t >= seconds) return true;
    }
    return false;
  };
  /** Hands still for `seconds` starting at sample `startK`. */
  const stillFrom = (startK: number, seconds: number) => {
    for (let k = startK + 1; k < samples.length; k++) {
      if (!isStill(k)) return false;
      if (samples[k]!.t - samples[startK]!.t >= seconds) return true;
    }
    return false;
  };

  // Address: the last still moment before the top with the hands in the lower half of the swing
  // (so a pause at the top is not mistaken for the set-up).
  if (candidates.top) {
    const topY = samples[top]!.hands.Y;
    const lowY = candidates.impact ? samples.find((s) => s.frame === candidates.impact!.frame)!.hands.Y : null;
    let address = -1;
    for (let k = top - 1; k >= 1; k--) {
      const lowEnough = lowY === null || samples[k]!.hands.Y >= topY + 0.5 * (lowY - topY);
      if (lowEnough && stillUntil(k, PHASE_LIMITS.stillSeconds)) {
        address = k;
        break;
      }
    }
    if (address < 0) unavailable.push({ phase: 'address', reason: 'The clip seems to start after the takeaway began (no still set-up found).' });
    else candidates.address = make('address', address);
  } else {
    unavailable.push({ phase: 'address', reason: 'Needs a top-of-backswing candidate first.' });
  }

  // Finish: the first still period after impact.
  if (candidates.impact) {
    const impactK = samples.findIndex((s) => s.frame === candidates.impact!.frame);
    let finish = -1;
    for (let k = impactK + 1; k < samples.length; k++) {
      if (samples[k]!.t - samples[impactK]!.t < 0.2) continue;
      if (stillFrom(k, PHASE_LIMITS.finishStillSeconds)) {
        finish = k;
        break;
      }
    }
    if (finish < 0) unavailable.push({ phase: 'finish', reason: 'The clip ends before the swing settles into a finish.' });
    else candidates.finish = make('finish', finish);
  } else {
    unavailable.push({ phase: 'finish', reason: 'Needs an impact candidate first.' });
  }

  const { address: a, top: tp, impact: im } = candidates;
  if (a && tp && (tp.t - a.t < 0.3 || tp.t - a.t > 2.5)) {
    notes.push('The backswing timing is outside the usual range; check the address and top candidates against the video.');
    a.confidence = 'low';
    tp.confidence = 'low';
  }
  if (tp && im && (im.t - tp.t < 0.1 || im.t - tp.t > 0.8)) {
    notes.push('The downswing timing is outside the usual range; check the top and impact candidates against the video.');
    tp.confidence = 'low';
    im.confidence = 'low';
  }
  if (spacing > PHASE_LIMITS.fineSpacingSeconds) {
    notes.push(`Frames are ${Math.round(spacing * 1000)} ms apart, so each phase time is uncertain by at least that much.`);
  }
  return { candidates, unavailable, notes };
}
