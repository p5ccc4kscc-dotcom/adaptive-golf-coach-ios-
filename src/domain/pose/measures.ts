import { FrameSize, angleAtDeg, jointPx, median, tiltFromVerticalDeg, torsoPx } from './geometry';
import { leadSide, sideJoint } from './joints';
import { PhaseName, PhaseResult } from './phases';
import { CameraView, MeasurementBasis, PoseFrame } from './types';

/**
 * Measurements a phone video of the body CAN support, each tagged with its
 * basis. Values are 2D image-plane quantities; none is a validated 3D
 * biomechanical measurement, and none is a coaching conclusion.
 */
export interface Measurement {
  id: string;
  label: string;
  value: number | null;
  unit: 'deg' | 'torso' | 's' | 'ratio';
  basis: MeasurementBasis;
  /** ± in the same unit, when it can be stated. */
  uncertainty: number | null;
  /** Why the value is null, or a caution about how to read it. */
  note: string;
}

/** Things body-pose tracking cannot see. Always listed as unavailable; never estimated. */
export const NOT_MEASURABLE: readonly { id: string; label: string }[] = [
  { id: 'clubface_angle', label: 'Clubface angle' },
  { id: 'club_path', label: 'Club path' },
  { id: 'face_to_path', label: 'Face-to-path' },
  { id: 'clubhead_speed', label: 'Clubhead speed' },
  { id: 'ball_speed', label: 'Ball speed' },
  { id: 'spin', label: 'Spin' },
  { id: 'launch', label: 'Launch angle and direction' },
  { id: 'carry', label: 'Carry distance' },
  { id: 'strike_location', label: 'Strike location on the face' },
];
export const NOT_MEASURABLE_REASON = 'Body-pose tracking finds body joints only. It does not see the club, the face or the ball.';

const at = (frames: readonly PoseFrame[], phases: PhaseResult, p: PhaseName) => {
  const c = phases.candidates[p];
  return c ? frames[c.frame] ?? null : null;
};

export function computeMeasurements(
  frames: readonly PoseFrame[],
  size: FrameSize,
  phases: PhaseResult,
  context: { hand: 'right' | 'left' | null; view: CameraView | null },
): Measurement[] {
  const out: Measurement[] = [];
  const { address, top, impact } = phases.candidates;
  const torso = median(frames.map((f) => torsoPx(f, size)).filter((v): v is number => v !== null && v > 0));

  // Timing (estimated: depends on the phase candidates).
  const timing = (id: string, label: string, a: typeof address, b: typeof top) => {
    out.push(
      a && b
        ? { id, label, value: b.t - a.t, unit: 's', basis: 'estimated', uncertainty: a.uncertaintySeconds + b.uncertaintySeconds, note: 'From swing-phase candidates; check them against the video.' }
        : { id, label, value: null, unit: 's', basis: 'estimated', uncertainty: null, note: 'Needs both phase candidates.' },
    );
  };
  timing('backswing_time', 'Backswing time (address → top)', address, top);
  timing('downswing_time', 'Downswing time (top → impact)', top, impact);
  const back = out.find((m) => m.id === 'backswing_time')!;
  const down = out.find((m) => m.id === 'downswing_time')!;
  if (back.value !== null && down.value !== null && down.value > 0) {
    const ratio = back.value / down.value;
    const rel = (back.uncertainty ?? 0) / back.value + (down.uncertainty ?? 0) / down.value;
    out.push({ id: 'tempo_ratio', label: 'Tempo ratio (backswing ÷ downswing)', value: ratio, unit: 'ratio', basis: 'estimated', uncertainty: ratio * rel, note: 'From swing-phase candidates.' });
  } else {
    out.push({ id: 'tempo_ratio', label: 'Tempo ratio (backswing ÷ downswing)', value: null, unit: 'ratio', basis: 'estimated', uncertainty: null, note: 'Needs backswing and downswing times.' });
  }

  // Head movement, in torso lengths, in the image plane.
  const headShift = (id: string, label: string, to: PhaseName) => {
    const a = at(frames, phases, 'address');
    const b = at(frames, phases, to);
    const na = a && jointPx(a, 'nose', size);
    const nb = b && jointPx(b, 'nose', size);
    if (!na || !nb || !torso) {
      out.push({ id, label, value: null, unit: 'torso', basis: 'calculated_2d', uncertainty: null, note: 'Needs the nose tracked at both positions.' });
      return;
    }
    out.push({
      id,
      label,
      value: Math.hypot(nb.X - na.X, nb.Y - na.Y) / torso,
      unit: 'torso',
      basis: 'calculated_2d',
      uncertainty: null,
      note: 'Straight-line movement of the nose in the picture, in torso lengths. Movement towards or away from the camera is not seen.',
    });
  };
  headShift('head_shift_top', 'Head movement, address → top', 'top');
  headShift('head_shift_impact', 'Head movement, address → impact', 'impact');

  // Trunk tilt from vertical (neck → hip centre), image plane.
  for (const p of ['address', 'top', 'impact'] as const) {
    const f = at(frames, phases, p);
    const neck = f && jointPx(f, 'neck', size);
    const root = f && jointPx(f, 'root', size);
    out.push(
      neck && root
        ? {
            id: `trunk_tilt_${p}`,
            label: `Trunk tilt in the picture at ${p === 'top' ? 'the top' : p}`,
            value: Math.abs(tiltFromVerticalDeg(root, neck)),
            unit: 'deg',
            basis: 'calculated_2d',
            uncertainty: null,
            note:
              context.view === 'dtl'
                ? '2D angle of the neck-to-hips line from vertical. Down the line this mostly reflects forward bend; not a 3D spine angle.'
                : context.view === 'fo'
                  ? '2D angle of the neck-to-hips line from vertical. Face-on this mostly reflects side bend; not a 3D spine angle.'
                  : '2D angle of the neck-to-hips line from vertical; meaning depends on the camera angle, which is not set.',
          }
        : { id: `trunk_tilt_${p}`, label: `Trunk tilt in the picture at ${p === 'top' ? 'the top' : p}`, value: null, unit: 'deg', basis: 'calculated_2d', uncertainty: null, note: 'Needs the neck and hips tracked at this position.' },
    );
  }

  // Lead-arm angle at the top (needs the playing hand to know which arm leads).
  {
    const f = at(frames, phases, 'top');
    const id = 'lead_arm_top';
    const label = 'Lead-arm angle at the top (elbow, in the picture)';
    if (!context.hand) {
      out.push({ id, label, value: null, unit: 'deg', basis: 'calculated_2d', uncertainty: null, note: 'Set your playing hand so the lead arm is known. It is never guessed.' });
    } else {
      const side = leadSide(context.hand);
      const s = f && jointPx(f, sideJoint(side, 'Shoulder'), size);
      const e = f && jointPx(f, sideJoint(side, 'Elbow'), size);
      const w = f && jointPx(f, sideJoint(side, 'Wrist'), size);
      const v = s && e && w ? angleAtDeg(s, e, w) : null;
      out.push({
        id,
        label,
        value: v,
        unit: 'deg',
        basis: 'calculated_2d',
        uncertainty: null,
        note: v === null ? 'Needs the lead shoulder, elbow and wrist tracked at the top.' : '180° = straight in the picture. Foreshortening towards the camera makes the arm look more bent or straighter than it is.',
      });
    }
  }
  return out;
}

/**
 * Video observations for the future coaching engine (M2). They are observations
 * only: never a fault, never proof of a ball-flight cause, and not yet eligible
 * as mastery evidence, because no threshold has been validated.
 */
export interface VideoObservation {
  kind: 'video_observation';
  measurementId: string;
  value: number;
  unit: Measurement['unit'];
  basis: MeasurementBasis;
  uncertainty: number | null;
  cameraView: CameraView | null;
  reliability: 'unvalidated';
  eligibleAsMasteryEvidence: false;
}

export function toObservations(measures: readonly Measurement[], view: CameraView | null): VideoObservation[] {
  return measures
    .filter((m): m is Measurement & { value: number } => m.value !== null && m.basis !== 'unavailable')
    .map((m) => ({ kind: 'video_observation', measurementId: m.id, value: m.value, unit: m.unit, basis: m.basis, uncertainty: m.uncertainty, cameraView: view, reliability: 'unvalidated', eligibleAsMasteryEvidence: false }));
}

export function formatMeasurement(m: Measurement): string {
  if (m.value === null) return 'Not available';
  const u = m.uncertainty;
  switch (m.unit) {
    case 's':
      return `${m.value.toFixed(2)} s${u !== null ? ` ± ${u.toFixed(2)}` : ''}`;
    case 'ratio':
      return `${m.value.toFixed(1)} : 1${u !== null ? ` (± ${u.toFixed(1)})` : ''}`;
    case 'deg':
      return `${Math.round(m.value)}°`;
    case 'torso':
      return `${m.value.toFixed(2)} torso lengths`;
  }
}
