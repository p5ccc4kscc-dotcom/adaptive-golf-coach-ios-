import { Fact, notAssessed } from './provenance';

/**
 * Golfer profile fields. Every field is optional and starts as
 * `not_assessed`. There are no production defaults for name, hand, ability,
 * measurements, clubs, scores or swing faults.
 */

export const PLAYING_HANDS = ['right', 'left', 'prefer_not_to_say', 'not_sure'] as const;
export type PlayingHand = (typeof PLAYING_HANDS)[number];

export const ABILITY_LEVELS = ['brand_new', 'beginner', 'improving', 'intermediate', 'advanced', 'prefer_not_to_say'] as const;
export type AbilityLevel = (typeof ABILITY_LEVELS)[number];

export const USUAL_ROUNDS = ['nine', 'eighteen', 'both', 'rarely_play'] as const;
export type UsualRounds = (typeof USUAL_ROUNDS)[number];

export const PRACTICE_TYPES = ['driving_range', 'short_game_area', 'putting_green', 'on_course', 'home_indoor', 'simulator', 'garden_net', 'lessons'] as const;
export type PracticeType = (typeof PRACTICE_TYPES)[number];

export const AGE_RANGES = ['under_18', '18_29', '30_44', '45_59', '60_74', '75_plus', 'prefer_not_to_say'] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const MOVEMENT_COMFORT = ['full_comfortable', 'some_limits', 'prefer_gentle', 'not_sure'] as const;
export type MovementComfort = (typeof MOVEMENT_COMFORT)[number];

export const PRACTICE_VOLUME = ['short_sessions', 'moderate_sessions', 'long_sessions', 'not_sure'] as const;
export type PracticeVolume = (typeof PRACTICE_VOLUME)[number];

export const TRANSPORT = ['walk_carry', 'walk_trolley', 'buggy_cart', 'mixed', 'not_sure'] as const;
export type Transport = (typeof TRANSPORT)[number];

export const CHALLENGES = [
  'slice_right',
  'hook_left',
  'push',
  'pull',
  'tops',
  'fats',
  'thin_shots',
  'unpredictable_strike',
  'distance_control',
  'bunker_confidence',
  'chipping_contact',
  'putt_start_line',
  'putt_pace',
  'green_reading',
  'penalty_avoidance',
  'club_gapping',
  'unsure',
] as const;
export type Challenge = (typeof CHALLENGES)[number];

export const PLAY_FREQUENCY = ['weekly_plus', 'fortnightly', 'monthly', 'few_times_year', 'not_yet'] as const;
export type PlayFrequency = (typeof PLAY_FREQUENCY)[number];

export const PRACTICE_AIDS = ['alignment_sticks', 'putting_mat', 'putting_mirror', 'launch_monitor', 'net', 'tripod', 'hitting_mat', 'impact_tape'] as const;
export type PracticeAid = (typeof PRACTICE_AIDS)[number];

export const SURFACE_ACCESS = ['grass_range', 'mat_range', 'short_game_grass', 'putting_green', 'indoor_space', 'none_regular'] as const;
export type SurfaceAccess = (typeof SURFACE_ACCESS)[number];

export interface Handicap {
  value: number;
  kind: 'official' | 'estimated';
}

export interface PlayerProfile {
  displayName: Fact<string>;
  playingHand: Fact<PlayingHand>;
  abilityLevel: Fact<AbilityLevel>;
  yearsPlayed: Fact<number>;
  handicap: Fact<Handicap>;
  usualRounds: Fact<UsualRounds>;
  practiceTypes: Fact<PracticeType[]>;
  typicalPracticeMinutes: Fact<number>;
  ageRange: Fact<AgeRange>;
  /** Canonical cm; unit records what the golfer entered in. */
  heightCm: Fact<number>;
  wristToFloorCm: Fact<number>;
  movementComfort: Fact<MovementComfort>;
  practiceVolume: Fact<PracticeVolume>;
  transport: Fact<Transport>;
  accessibilityNeeds: Fact<string>;
  comfortNotes: Fact<string>;
  challenges: Fact<Challenge[]>;
  challengesOther: Fact<string>;
  playFrequency: Fact<PlayFrequency>;
  /** Straight-line indoor floor space in metres (canonical). */
  indoorSpaceM: Fact<number>;
  practiceAids: Fact<PracticeAid[]>;
  surfaceAccess: Fact<SurfaceAccess[]>;
  coachName: Fact<string>;
  coachNotes: Fact<string>;
  upcomingEvents: Fact<string>;
  existingLessonFocus: Fact<string>;
}

export type ProfileFieldKey = keyof PlayerProfile;

export const PROFILE_FIELD_KEYS: readonly ProfileFieldKey[] = [
  'displayName',
  'playingHand',
  'abilityLevel',
  'yearsPlayed',
  'handicap',
  'usualRounds',
  'practiceTypes',
  'typicalPracticeMinutes',
  'ageRange',
  'heightCm',
  'wristToFloorCm',
  'movementComfort',
  'practiceVolume',
  'transport',
  'accessibilityNeeds',
  'comfortNotes',
  'challenges',
  'challengesOther',
  'playFrequency',
  'indoorSpaceM',
  'practiceAids',
  'surfaceAccess',
  'coachName',
  'coachNotes',
  'upcomingEvents',
  'existingLessonFocus',
];

/** Fields that may contain sensitive personal information; never logged. */
export const SENSITIVE_FIELDS: readonly ProfileFieldKey[] = ['heightCm', 'wristToFloorCm', 'movementComfort', 'accessibilityNeeds', 'comfortNotes', 'ageRange', 'coachName', 'coachNotes'];

export function emptyProfile(): PlayerProfile {
  const p = {} as Record<ProfileFieldKey, Fact<unknown>>;
  for (const key of PROFILE_FIELD_KEYS) p[key] = notAssessed();
  return p as unknown as PlayerProfile;
}

export const LABELS = {
  playingHand: {
    right: 'Right-handed',
    left: 'Left-handed',
    prefer_not_to_say: 'Prefer not to say',
    not_sure: 'Not sure',
  } satisfies Record<PlayingHand, string>,
  abilityLevel: {
    brand_new: 'Brand new',
    beginner: 'Beginner',
    improving: 'Improving',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    prefer_not_to_say: 'Prefer not to say',
  } satisfies Record<AbilityLevel, string>,
  usualRounds: {
    nine: '9 holes',
    eighteen: '18 holes',
    both: 'Both',
    rarely_play: 'Rarely play',
  } satisfies Record<UsualRounds, string>,
  practiceTypes: {
    driving_range: 'Driving range',
    short_game_area: 'Short-game area',
    putting_green: 'Putting green',
    on_course: 'On the course',
    home_indoor: 'At home / indoors',
    simulator: 'Simulator',
    garden_net: 'Garden net',
    lessons: 'Lessons',
  } satisfies Record<PracticeType, string>,
  ageRange: {
    under_18: 'Under 18',
    '18_29': '18–29',
    '30_44': '30–44',
    '45_59': '45–59',
    '60_74': '60–74',
    '75_plus': '75+',
    prefer_not_to_say: 'Prefer not to say',
  } satisfies Record<AgeRange, string>,
  movementComfort: {
    full_comfortable: 'Comfortable with a full swing',
    some_limits: 'Some movements are limited',
    prefer_gentle: 'Prefer gentle, shorter swings',
    not_sure: 'Not sure',
  } satisfies Record<MovementComfort, string>,
  practiceVolume: {
    short_sessions: 'Short sessions (under 30 min)',
    moderate_sessions: 'Moderate (30–60 min)',
    long_sessions: 'Longer sessions (60+ min)',
    not_sure: 'Not sure',
  } satisfies Record<PracticeVolume, string>,
  transport: {
    walk_carry: 'Walk and carry',
    walk_trolley: 'Walk with trolley',
    buggy_cart: 'Buggy / cart',
    mixed: 'Mixed',
    not_sure: 'Not sure',
  } satisfies Record<Transport, string>,
  challenges: {
    slice_right: 'Slice — curves right (right-handed) / left (left-handed)',
    hook_left: 'Hook — curves left (right-handed) / right (left-handed)',
    push: 'Push — starts right (right-handed) / left (left-handed), little curve',
    pull: 'Pull — starts left (right-handed) / right (left-handed), little curve',
    tops: 'Topped shots',
    fats: 'Fat / heavy shots',
    thin_shots: 'Thin shots',
    unpredictable_strike: 'Unpredictable strike',
    distance_control: 'Distance control',
    bunker_confidence: 'Bunker confidence',
    chipping_contact: 'Chipping contact',
    putt_start_line: 'Putt start line',
    putt_pace: 'Putt pace',
    green_reading: 'Green reading',
    penalty_avoidance: 'Avoiding penalty shots',
    club_gapping: 'Knowing club distances / gaps',
    unsure: 'Not sure yet',
  } satisfies Record<Challenge, string>,
  playFrequency: {
    weekly_plus: 'Weekly or more',
    fortnightly: 'Every couple of weeks',
    monthly: 'Monthly',
    few_times_year: 'A few times a year',
    not_yet: 'Not playing on a course yet',
  } satisfies Record<PlayFrequency, string>,
  practiceAids: {
    alignment_sticks: 'Alignment sticks',
    putting_mat: 'Putting mat',
    putting_mirror: 'Putting mirror',
    launch_monitor: 'Launch monitor',
    net: 'Net',
    tripod: 'Phone tripod',
    hitting_mat: 'Hitting mat',
    impact_tape: 'Impact tape / spray',
  } satisfies Record<PracticeAid, string>,
  surfaceAccess: {
    grass_range: 'Grass range',
    mat_range: 'Mat range',
    short_game_grass: 'Short-game grass area',
    putting_green: 'Putting green',
    indoor_space: 'Indoor space',
    none_regular: 'No regular practice facility',
  } satisfies Record<SurfaceAccess, string>,
};

/**
 * Direction words for ball-flight challenges depend on hand. For a right-handed
 * golfer the lead side is the left; for a left-handed golfer, the right.
 * Returns null when hand is unknown so the UI keeps neutral wording.
 */
export function ballFlightDirectionHint(hand: PlayingHand | null, challenge: Challenge): string | null {
  if (hand !== 'right' && hand !== 'left') return null;
  const lead = hand === 'right' ? 'left' : 'right';
  const trail = hand === 'right' ? 'right' : 'left';
  switch (challenge) {
    case 'slice_right':
      return `For you: curves to the ${trail}`;
    case 'hook_left':
      return `For you: curves to the ${lead}`;
    case 'push':
      return `For you: starts ${trail} of target`;
    case 'pull':
      return `For you: starts ${lead} of target`;
    default:
      return null;
  }
}

export interface PlayerGoal {
  id: string;
  ownerId: string;
  text: string;
  measurableDefinition: string | null;
  priority: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export function validateGoalText(text: string): string | null {
  const t = text.trim();
  if (!t) return 'Describe the goal.';
  if (t.length > 200) return 'Keep the goal to 200 characters or fewer.';
  return null;
}

export interface BaselineRound {
  id: string;
  ownerId: string;
  playedOn: string;
  holes: 9 | 18;
  totalStrokes: number | null;
  totalPutts: number | null;
  courseName: string | null;
  source: 'self_reported' | 'imported';
  notes: string | null;
  createdAt: string;
}

export function validateBaselineRound(
  input: { playedOn: string; holes: number; totalStrokes: number | null; totalPutts: number | null },
  todayLocal: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.playedOn)) errors.playedOn = 'Date must be YYYY-MM-DD.';
  else if (input.playedOn > todayLocal) errors.playedOn = 'Date cannot be in the future.';
  if (input.holes !== 9 && input.holes !== 18) errors.holes = 'Choose 9 or 18 holes.';
  const minStrokes = input.holes;
  if (input.totalStrokes !== null) {
    if (!Number.isInteger(input.totalStrokes) || input.totalStrokes < minStrokes || input.totalStrokes > input.holes * 15) {
      errors.totalStrokes = `Score must be a whole number between ${minStrokes} and ${input.holes * 15}.`;
    }
  }
  if (input.totalPutts !== null) {
    if (!Number.isInteger(input.totalPutts) || input.totalPutts < 0 || input.totalPutts > input.holes * 10) {
      errors.totalPutts = 'Putts must be a whole number.';
    } else if (input.totalStrokes !== null && input.totalPutts > input.totalStrokes) {
      errors.totalPutts = 'Putts cannot exceed the total score.';
    }
  }
  return errors;
}
