/**
 * Optional baseline information a golfer may enter during onboarding or later:
 * hole-by-hole putts for past rounds, recent range outcomes, coach notes, and
 * (from M2) approved per-skill baselines. Nothing here is ever filled in
 * automatically, and missing values stay null — never zero.
 */

// ---------------------------------------------------------------------------
// Hole-by-hole putts
// ---------------------------------------------------------------------------

export const PUTTS_PER_HOLE_MAX = 10;

export interface PuttsSummary {
  holes: number;
  /** Holes with a recorded putt count. */
  recordedHoles: number;
  /** Sum over recorded holes only; null when no hole was recorded. */
  total: number | null;
}

/** `holes[i]` is the putt count for hole i+1, or null when not recorded. */
export function summarisePutts(holes: readonly (number | null)[]): PuttsSummary {
  const recorded = holes.filter((h): h is number => h !== null);
  return { holes: holes.length, recordedHoles: recorded.length, total: recorded.length === 0 ? null : recorded.reduce((a, b) => a + b, 0) };
}

/** Human label that always shows the denominator, e.g. "14 putts (7/9 holes recorded)". */
export function puttsLabel(summary: PuttsSummary): string {
  if (summary.total === null) return 'putts not recorded';
  if (summary.recordedHoles === summary.holes) return `${summary.total} putts`;
  return `${summary.total} putts (${summary.recordedHoles}/${summary.holes} holes recorded)`;
}

/** Putts text for a baseline round, from hole-by-hole data when present. */
export function roundPuttsText(r: { holePutts: (number | null)[] | null; totalPutts: number | null }): string {
  if (r.holePutts) return puttsLabel(summarisePutts(r.holePutts));
  return r.totalPutts === null ? 'putts not recorded' : `${r.totalPutts} putts`;
}

export function validateHolePutts(values: readonly (number | null)[], holes: 9 | 18): string | null {
  if (values.length !== holes) return `Enter putts for ${holes} holes (leave any hole blank if not counted).`;
  for (const v of values) {
    if (v === null) continue;
    if (Number.isNaN(v) || !Number.isInteger(v) || v < 0 || v > PUTTS_PER_HOLE_MAX) return `Putts per hole must be a whole number from 0 to ${PUTTS_PER_HOLE_MAX}.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Recent range outcomes
// ---------------------------------------------------------------------------

/** Which club a record refers to: one in the active bag, another owned club, or unknown. */
export type ClubChoiceKind = 'bag' | 'other_owned' | 'unknown';

export interface ClubChoice {
  kind: ClubChoiceKind;
  clubInstanceId: string | null;
}

export const UNKNOWN_CLUB: ClubChoice = { kind: 'unknown', clubInstanceId: null };

export type RangeContext = 'grass_range' | 'mat_range' | 'indoor_net' | 'simulator' | 'course_practice' | 'other';

export const RANGE_CONTEXT_LABELS: Record<RangeContext, string> = {
  grass_range: 'Grass range',
  mat_range: 'Mat range',
  indoor_net: 'Indoor / net',
  simulator: 'Simulator',
  course_practice: 'On the course (practice)',
  other: 'Other',
};

export interface BaselineRangeOutcome {
  id: string;
  ownerId: string;
  observedOn: string;
  club: ClubChoice;
  context: RangeContext;
  shots: number;
  /** Shots meeting the golfer's own definition; null if not counted. */
  successes: number | null;
  successDefinition: string | null;
  notes: string | null;
  source: 'self_reported' | 'imported';
  createdAt: string;
}

export function validateRangeOutcome(
  input: { observedOn: string; club: ClubChoice | null; shots: number | null; successes: number | null; successDefinition: string },
  todayLocal: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.observedOn)) errors.observedOn = 'Date must be YYYY-MM-DD.';
  else if (input.observedOn > todayLocal) errors.observedOn = 'Date cannot be in the future.';
  if (!input.club) errors.club = 'Choose the club, or “Unknown / not entered”.';
  else if (input.club.kind !== 'unknown' && !input.club.clubInstanceId) errors.club = 'Choose a club.';
  if (input.shots === null || Number.isNaN(input.shots) || !Number.isInteger(input.shots) || input.shots < 1 || input.shots > 500) {
    errors.shots = 'Shots must be a whole number from 1 to 500.';
  }
  if (input.successes !== null) {
    if (Number.isNaN(input.successes) || !Number.isInteger(input.successes) || input.successes < 0) errors.successes = 'Successful shots must be a whole number.';
    else if (input.shots !== null && input.successes > input.shots) errors.successes = 'Successful shots cannot exceed shots hit.';
    else if (!input.successDefinition.trim()) errors.successDefinition = 'Say what counted as a success (e.g. “finished playable”).';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Coach notes
// ---------------------------------------------------------------------------

export interface GolfCoachNote {
  id: string;
  ownerId: string;
  coachName: string | null;
  /** Local date the advice was given. */
  notedOn: string;
  text: string;
  clubInstanceId: string | null;
  /** Typed in by the golfer = self_reported; only a coach-authored note may be coach_confirmed (future). */
  source: 'self_reported' | 'coach_confirmed';
  createdAt: string;
  archivedAt: string | null;
}

export function validateCoachNote(input: { notedOn: string; text: string }, todayLocal: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.text.trim()) errors.text = 'Write the note.';
  else if (input.text.length > 2000) errors.text = 'Keep the note to 2000 characters or fewer.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.notedOn)) errors.notedOn = 'Date must be YYYY-MM-DD.';
  else if (input.notedOn > todayLocal) errors.notedOn = 'Date cannot be in the future.';
  return errors;
}

// ---------------------------------------------------------------------------
// Player skill baselines (persisted model; populated by the skills engine in M2)
// ---------------------------------------------------------------------------

export interface PlayerSkillBaseline {
  id: string;
  ownerId: string;
  skillId: string;
  level: number;
  /** e.g. 'indoor_mat', 'outdoor_green', 'grass_range' — like-for-like comparisons only. */
  context: string;
  clubInstanceId: string | null;
  cameraView: 'dtl' | 'fo' | null;
  measurementVersion: string;
  provenance: 'self_reported' | 'coach_confirmed' | 'device_measured' | 'imported';
  /** Structured evidence summary (sample sizes, rates, session ids). */
  summary: Record<string, unknown>;
  approvedBy: string | null;
  approvalRationale: string | null;
  createdAt: string;
  supersededAt: string | null;
}
