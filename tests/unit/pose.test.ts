import { compareAnalyses } from '@/domain/pose/compare';
import { decodeFrames } from '@/domain/pose/decode';
import { JOINTS, JOINT_INDEX, leadSide } from '@/domain/pose/joints';
import { NOT_MEASURABLE, computeMeasurements, toObservations } from '@/domain/pose/measures';
import { applyPhaseMarks, detectPhases } from '@/domain/pose/phases';
import { assessPose, assessVideo } from '@/domain/pose/quality';
import { planSampling, swingWindow } from '@/domain/pose/sampling';

import { syntheticSwing } from '../fixtures/syntheticSwing';

// All pose frames in this file are SYNTHETIC TEST DATA (tests/fixtures/syntheticSwing.ts).
const SIZE = { displayWidth: 1080, displayHeight: 1920 };
const META = { durationSeconds: 2.67, displayWidth: 1080, displayHeight: 1920, rotationDegrees: 90, nominalFrameRate: 120, estimatedFrameCount: 320, codec: 'hvc1', fileSizeBytes: null };

describe('decoding native frames', () => {
  it('treats undetected and low-confidence joints as unknown, never as zero', () => {
    const p = JOINTS.flatMap((_, i) => (i === 0 ? [0.4, 0.2, 0.9] : i === 1 ? [0.41, 0.19, 0.1] : [-1, -1, 0]));
    const [f] = decodeFrames([{ t: 0.5, i: 3, n: 1, p }]);
    expect(f!.joints[0]).toEqual({ x: 0.4, y: 0.2, c: 0.9 });
    expect(f!.joints[1]).toBeNull();
    expect(f!.joints[JOINT_INDEX.leftWrist]).toBeNull();
  });
  it('sorts by presentation time', () => {
    const p = JOINTS.flatMap(() => [-1, -1, 0]);
    expect(decodeFrames([{ t: 0.2, i: 2, n: 0, p }, { t: 0.1, i: 1, n: 0, p }]).map((f) => f.t)).toEqual([0.1, 0.2]);
  });
});

describe('video quality', () => {
  it('blocks a clip too short for a swing and warns on low frame rate and resolution', () => {
    expect(assessVideo({ ...META, durationSeconds: 0.3 }).ok).toBe(false);
    const low = assessVideo({ ...META, nominalFrameRate: 24, displayWidth: 320, displayHeight: 240 });
    expect(low.ok).toBe(true);
    expect(low.issues.map((i) => i.code)).toEqual(expect.arrayContaining(['low_fps', 'low_resolution']));
    expect(assessVideo({ ...META, nominalFrameRate: 240 }).issues).toEqual([]);
  });
});

describe('pose quality', () => {
  it('marks a clip with nobody detected as unusable', () => {
    const p = JOINTS.flatMap(() => [-1, -1, 0]);
    const q = assessPose(decodeFrames(Array.from({ length: 30 }, (_, i) => ({ t: i / 30, i, n: 0, p }))));
    expect(q.verdict).toBe('unusable');
    expect(q.issues.some((i) => i.code === 'person_not_found' && i.severity === 'block')).toBe(true);
  });
  it('warns when more than one person is in view', () => {
    const q = assessPose(decodeFrames(syntheticSwing({ fps: 60, bodies: 2 }).frames));
    expect(q.issues.some((i) => i.code === 'multiple_people')).toBe(true);
  });
  it('rates a fully tracked clip as usable', () => {
    expect(assessPose(decodeFrames(syntheticSwing({ fps: 120 }).frames)).verdict).toBe('usable');
  });
});

describe('swing-phase candidates', () => {
  const { frames: raw, expected } = syntheticSwing({ fps: 120 });
  const frames = decodeFrames(raw);
  const result = detectPhases(frames, SIZE);

  it('finds top and impact within two frames of where they are in the test data', () => {
    expect(result.candidates.top!.t).toBeCloseTo(expected.top, 1);
    expect(Math.abs(result.candidates.top!.t - expected.top)).toBeLessThanOrEqual(2 / 120);
    expect(Math.abs(result.candidates.impact!.t - expected.impact)).toBeLessThanOrEqual(2 / 120);
  });
  it('finds address at, or shortly after, the start of the takeaway (a known lag of the stillness rule)', () => {
    const a = result.candidates.address!.t;
    expect(a).toBeGreaterThanOrEqual(expected.address - 1 / 120);
    expect(a).toBeLessThanOrEqual(expected.address + 0.25);
  });
  it('finds the finish when the hands settle', () => {
    expect(Math.abs(result.candidates.finish!.t - expected.finish)).toBeLessThanOrEqual(0.1);
  });
  it('states uncertainty of at least one frame and never claims high confidence', () => {
    for (const c of Object.values(result.candidates)) {
      expect(c!.uncertaintySeconds).toBeGreaterThanOrEqual(1 / 120 - 1e-9);
      expect(['low', 'medium']).toContain(c!.confidence);
    }
  });
  it('lowers confidence and says why at 30 fps', () => {
    const r = detectPhases(decodeFrames(syntheticSwing({ fps: 30 }).frames), SIZE);
    expect(Object.values(r.candidates).every((c) => c!.confidence === 'low')).toBe(true);
    expect(r.notes.join(' ')).toMatch(/ms apart/);
  });
  it('reports phases as unavailable when the hands are mostly not tracked', () => {
    const n = raw.length;
    const r = detectPhases(decodeFrames(syntheticSwing({ fps: 120, dropWristFrames: Array.from({ length: n }, (_, i) => i).filter((i) => i % 2 === 0) }).frames), SIZE);
    expect(Object.keys(r.candidates)).toHaveLength(4 - r.unavailable.length);
    expect(r.unavailable).toHaveLength(4);
  });
  it('reports nothing when there is no swing in the clip', () => {
    const still = syntheticSwing({ fps: 60 }).frames.slice(0, 30);
    const r = detectPhases(decodeFrames(still), SIZE);
    expect(r.candidates).toEqual({});
    expect(r.unavailable[0]!.reason).toMatch(/No fast hand movement/);
  });
  it('is unaffected by playing hand (it uses only up/down position and speed)', () => {
    // The function takes no hand at all; this documents the design.
    expect(detectPhases.length).toBe(2);
  });
});

describe('measurements', () => {
  const frames = decodeFrames(syntheticSwing({ fps: 120, headShiftAtTop: 0.05 }).frames);
  const phases = detectPhases(frames, SIZE);

  it('tags every value with its basis and keeps timing uncertainty', () => {
    const m = computeMeasurements(frames, SIZE, phases, { hand: 'right', view: 'fo' });
    const tempo = m.find((x) => x.id === 'tempo_ratio')!;
    expect(tempo.basis).toBe('estimated');
    expect(tempo.value).toBeGreaterThan(1.5);
    expect(tempo.uncertainty).toBeGreaterThan(0);
    const head = m.find((x) => x.id === 'head_shift_top')!;
    expect(head.basis).toBe('calculated_2d');
    // 0.05 of 1080 px = 54 px; torso = 0.25 of 1920 px = 480 px.
    expect(head.value).toBeCloseTo(54 / 480, 2);
  });
  it('never guesses the lead arm when the playing hand is unknown', () => {
    const unknown = computeMeasurements(frames, SIZE, phases, { hand: null, view: 'fo' }).find((x) => x.id === 'lead_arm_top')!;
    expect(unknown.value).toBeNull();
    expect(unknown.note).toMatch(/never guessed/);
    expect(leadSide('right')).toBe('left');
    expect(leadSide('left')).toBe('right');
  });
  it('never produces club or ball measurements', () => {
    const ids = computeMeasurements(frames, SIZE, phases, { hand: 'left', view: 'dtl' }).map((x) => x.id);
    for (const nm of NOT_MEASURABLE) expect(ids).not.toContain(nm.id);
    expect(NOT_MEASURABLE.map((n) => n.id)).toEqual(expect.arrayContaining(['clubface_angle', 'club_path', 'face_to_path', 'clubhead_speed', 'ball_speed', 'spin', 'carry', 'strike_location']));
  });
  it('turns values into observations that are not mastery evidence and not faults', () => {
    const obs = toObservations(computeMeasurements(frames, SIZE, phases, { hand: 'right', view: 'fo' }), 'fo');
    expect(obs.length).toBeGreaterThan(0);
    for (const o of obs) {
      expect(o.kind).toBe('video_observation');
      expect(o.eligibleAsMasteryEvidence).toBe(false);
      expect(o.reliability).toBe('unvalidated');
    }
  });
});

describe('comparing two recordings', () => {
  const run = (o: Parameters<typeof syntheticSwing>[0], view: 'fo' | 'dtl' | null) => {
    const frames = decodeFrames(syntheticSwing(o).frames);
    const phases = detectPhases(frames, SIZE);
    return { phases, view, measures: computeMeasurements(frames, SIZE, phases, { hand: 'right', view }) };
  };

  it('compares timing across views but 2D angles only within the same view', () => {
    const a = run({ fps: 120 }, 'fo');
    const b = run({ fps: 120, downswingS: 0.33 }, 'dtl');
    const c = compareAnalyses(a, b);
    expect(c.warnings[0]).toMatch(/different angles/);
    expect(c.rows.every((r) => ['backswing_time', 'downswing_time', 'tempo_ratio'].includes(r.id))).toBe(true);
    const down = c.rows.find((r) => r.id === 'downswing_time')!;
    expect(down.difference).toBeCloseTo(0.06, 1);
    expect(c.alignedFrames.impact).toBeDefined();
    const same = compareAnalyses(a, run({ fps: 120 }, 'fo'));
    expect(same.rows.some((r) => r.id.startsWith('trunk_tilt'))).toBe(true);
  });
  it('calls a difference smaller than the timing uncertainty not meaningful', () => {
    const c = compareAnalyses(run({ fps: 30 }, 'fo'), run({ fps: 30, downswingS: 0.28 }, 'fo'));
    const down = c.rows.find((r) => r.id === 'downswing_time')!;
    expect(down.beyondUncertainty).toBe(false);
  });
  it('compares only timing when the view is unknown', () => {
    expect(compareAnalyses(run({ fps: 120 }, null), run({ fps: 120 }, null)).warnings[0]).toMatch(/not set/);
  });
});


describe('sampling plan (performance-aware, spec §4.1)', () => {
  it('analyses short clips frame by frame and long or slow-motion clips in two passes', () => {
    expect(planSampling({ ...META, estimatedFrameCount: 320 }).passes).toBe(1);
    expect(planSampling({ ...META, nominalFrameRate: 240, durationSeconds: 8, estimatedFrameCount: 1920 }).passes).toBe(2);
  });
  it('keeps a margin around the swing found by the coarse pass', () => {
    const { frames, expected } = syntheticSwing({ fps: 30, addressS: 2 });
    const w = swingWindow(detectPhases(decodeFrames(frames), SIZE), 10)!;
    expect(w.startSeconds).toBeLessThan(expected.address);
    expect(w.endSeconds).toBeGreaterThan(expected.finish);
    expect(w.startSeconds).toBeGreaterThan(1);
  });
  it('returns no window when the coarse pass found no swing', () => {
    expect(swingWindow({ candidates: {}, unavailable: [], notes: [] }, 10)).toBeNull();
  });
});

describe('golfer phase marks', () => {
  it('replace the automatic candidate and are labelled manual', () => {
    const frames = decodeFrames(syntheticSwing({ fps: 120 }).frames);
    const auto = detectPhases(frames, SIZE);
    const marked = applyPhaseMarks(auto, [{ phase: 'top', frame: 160, t: frames[160]!.t }], frames);
    expect(marked.candidates.top).toMatchObject({ frame: 160, confidence: 'manual' });
    expect(marked.candidates.impact).toEqual(auto.candidates.impact);
  });
});

describe('face-on head movement towards the target', () => {
  it('is positive when the head moves towards the lead-shoulder side and needs the hand', () => {
    const frames = decodeFrames(syntheticSwing({ fps: 120, headShiftAtTop: 0.02 }).frames);
    const phases = detectPhases(frames, SIZE);
    const right = computeMeasurements(frames, SIZE, phases, { hand: 'right', view: 'fo' }).find((m) => m.id === 'head_target_top')!;
    // Lead (left) shoulder is at image x 0.55, trail at 0.45: target is towards +x. 0.02 / 0.10 = +20%.
    expect(right.value).toBeCloseTo(0.2, 2);
    const left = computeMeasurements(frames, SIZE, phases, { hand: 'left', view: 'fo' }).find((m) => m.id === 'head_target_top')!;
    expect(left.value).toBeCloseTo(-0.2, 2);
    expect(computeMeasurements(frames, SIZE, phases, { hand: 'right', view: 'dtl' }).find((m) => m.id === 'head_target_top')!.value).toBeNull();
    expect(computeMeasurements(frames, SIZE, phases, { hand: null, view: 'fo' }).find((m) => m.id === 'head_target_top')!.value).toBeNull();
  });
});
