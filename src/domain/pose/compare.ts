import { Measurement } from './measures';
import { PHASES, PhaseName, PhaseResult } from './phases';
import { CameraView } from './types';

export interface ComparisonRow {
  id: string;
  label: string;
  a: number | null;
  b: number | null;
  difference: number | null;
  /** True only when the difference is larger than the stated uncertainty of both values together. */
  beyondUncertainty: boolean | null;
  note: string;
}

export interface Comparison {
  comparable: boolean;
  warnings: string[];
  rows: ComparisonRow[];
  /** Matching analysed-frame indices for side-by-side viewing, per phase found in both. */
  alignedFrames: Partial<Record<PhaseName, { a: number; b: number }>>;
}

/**
 * Compares two analysed recordings. Timing can be compared across camera
 * angles; 2D angles and positions only when both clips use the same view.
 */
export function compareAnalyses(
  a: { measures: readonly Measurement[]; phases: PhaseResult; view: CameraView | null },
  b: { measures: readonly Measurement[]; phases: PhaseResult; view: CameraView | null },
): Comparison {
  const warnings: string[] = [];
  const sameView = a.view !== null && a.view === b.view;
  if (!sameView) {
    warnings.push(
      a.view === null || b.view === null
        ? 'The camera angle is not set for both clips, so only timing is compared.'
        : 'The clips were filmed from different angles, so only timing is compared.',
    );
  }
  const rows: ComparisonRow[] = [];
  for (const ma of a.measures) {
    const mb = b.measures.find((m) => m.id === ma.id);
    if (!mb) continue;
    const timingOnly = ma.unit === 's' || ma.unit === 'ratio';
    if (!timingOnly && !sameView) continue;
    const diff = ma.value !== null && mb.value !== null ? mb.value - ma.value : null;
    const u = ma.uncertainty !== null && mb.uncertainty !== null ? ma.uncertainty + mb.uncertainty : null;
    rows.push({
      id: ma.id,
      label: ma.label,
      a: ma.value,
      b: mb.value,
      difference: diff,
      beyondUncertainty: diff === null || u === null ? null : Math.abs(diff) > u,
      note: diff === null ? 'Not available in both clips.' : u === null ? 'No uncertainty can be stated for this 2D value; small differences may be noise.' : Math.abs(diff) > u ? 'Larger than the timing uncertainty.' : 'Within the timing uncertainty: not a meaningful difference.',
    });
  }
  const alignedFrames: Comparison['alignedFrames'] = {};
  for (const p of PHASES) {
    const ca = a.phases.candidates[p];
    const cb = b.phases.candidates[p];
    if (ca && cb) alignedFrames[p] = { a: ca.frame, b: cb.frame };
  }
  return { comparable: rows.some((r) => r.difference !== null), warnings, rows, alignedFrames };
}
