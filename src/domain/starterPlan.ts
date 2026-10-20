import { ClubInstance, clubDisplayName, effectiveCategory } from './clubs';
import { ClubCategory } from './clubCatalog';
import { Challenge, PlayerProfile, challengeLabel } from './profile';

/**
 * Builds the outline of a 10–15 minute *diagnostic* starter session from the
 * golfer's own answers and the clubs actually in their active bag.
 *
 * It never claims a fault. It only picks areas to look at, and only with
 * clubs the golfer has. Detailed drill steps and logging arrive with the
 * curriculum engine (M2).
 */

export type StarterArea = 'putting' | 'chipping' | 'contact' | 'start_line' | 'gapping' | 'bunker' | 'course_management' | 'fundamentals';

export interface StarterItem {
  area: StarterArea;
  title: string;
  reason: string;
  clubId: string | null;
  clubLabel: string | null;
  minutes: number;
}

export interface StarterPlanOutline {
  items: StarterItem[];
  unavailable: string[];
  notes: string[];
  totalMinutes: number;
}

const AREA_FOR_CHALLENGE: Record<Challenge, StarterArea | null> = {
  slice_right: 'start_line',
  hook_left: 'start_line',
  push: 'start_line',
  pull: 'start_line',
  tops: 'contact',
  fats: 'contact',
  thin_shots: 'contact',
  unpredictable_strike: 'contact',
  distance_control: 'gapping',
  club_gapping: 'gapping',
  bunker_confidence: 'bunker',
  chipping_contact: 'chipping',
  putt_start_line: 'putting',
  putt_pace: 'putting',
  green_reading: 'putting',
  penalty_avoidance: 'course_management',
  unsure: null,
};

const TITLES: Record<StarterArea, string> = {
  putting: 'Putting start-line and pace check',
  chipping: 'Chip contact check',
  contact: 'Strike quality check',
  start_line: 'Start line and curve log',
  gapping: 'Carry distance sampling',
  bunker: 'Bunker basics check',
  course_management: 'Target and penalty-avoidance review',
  fundamentals: 'Posture and alignment awareness (no club needed)',
};

const LONG_ORDER: ClubCategory[] = ['driver', 'fairway_wood', 'hybrid', 'utility_iron', 'iron'];

function pickClub(area: StarterArea, bag: ClubInstance[]): ClubInstance | null | 'none_needed' {
  const byCat = (cats: ClubCategory[]) => bag.filter((c) => cats.includes(effectiveCategory(c)));
  switch (area) {
    case 'putting':
      return byCat(['putter'])[0] ?? null;
    case 'chipping':
      return byCat(['wedge'])[0] ?? byCat(['specialist'])[0] ?? null;
    case 'bunker': {
      const sand = bag.find((c) => c.typeCode === 'wedge_sw');
      return sand ?? bag.find((c) => c.typeCode === 'wedge_lw' || c.typeCode === 'wedge_high_loft' || (c.typeCode === 'wedge_by_loft' && (c.loftDeg ?? 0) >= 54)) ?? null;
    }
    case 'contact': {
      const irons = byCat(['iron']);
      if (irons.length > 0) return irons[Math.floor(irons.length / 2)]!;
      return byCat(['hybrid', 'wedge'])[0] ?? null;
    }
    case 'start_line': {
      for (const cat of LONG_ORDER) {
        const found = byCat([cat])[0];
        if (found) return found;
      }
      return null;
    }
    case 'gapping':
      return byCat(['iron', 'wedge', 'hybrid'])[0] ?? null;
    case 'course_management':
    case 'fundamentals':
      return 'none_needed';
  }
}

const NEEDS_TEXT: Record<StarterArea, string> = {
  putting: 'add a putter to My Bag',
  chipping: 'add a wedge or chipper to My Bag',
  bunker: 'add a sand wedge or other lofted wedge to My Bag',
  contact: 'add an iron, hybrid or wedge to My Bag',
  start_line: 'add a long club (driver, wood, hybrid or iron) to My Bag',
  gapping: 'add an iron, wedge or hybrid to My Bag',
  course_management: '',
  fundamentals: '',
};

/** Always the last note: the outline never claims a fault. */
export const DIAGNOSTIC_NOTE = 'This is a diagnostic look, not a diagnosis. BadGolfer will not assume any fault until you log real outcomes.';

/** sortedBag must already be in bag order (longest to shortest). */
export function buildStarterPlanOutline(profile: PlayerProfile, sortedBag: ClubInstance[]): StarterPlanOutline {
  const reported = (profile.challenges.value ?? []).filter((c) => c !== 'unsure');
  const areas: { area: StarterArea; reason: string }[] = [];
  for (const challenge of reported) {
    const area = AREA_FOR_CHALLENGE[challenge];
    if (area && !areas.some((a) => a.area === area)) {
      areas.push({ area, reason: `You reported: ${challengeLabel(challenge, profile.playingHand.value)}.` });
    }
  }
  const generic: StarterArea[] = ['putting', 'chipping', 'start_line'];
  for (const area of generic) {
    if (areas.length >= 3) break;
    if (!areas.some((a) => a.area === area)) {
      areas.push({ area, reason: reported.length === 0 ? 'No challenges reported yet — a general look at this area.' : 'A general look at another area.' });
    }
  }

  const items: StarterItem[] = [];
  const unavailable: string[] = [];
  for (const { area, reason } of areas) {
    if (items.length >= 3) break;
    const club = pickClub(area, sortedBag);
    if (club === null) {
      unavailable.push(`${TITLES[area]}: ${NEEDS_TEXT[area]} to include this.`);
      continue;
    }
    items.push({
      area,
      title: TITLES[area],
      reason,
      clubId: club === 'none_needed' ? null : club.id,
      clubLabel: club === 'none_needed' ? null : clubDisplayName(club),
      minutes: 4,
    });
  }
  if (items.length === 0) {
    items.push({
      area: 'fundamentals',
      title: TITLES.fundamentals,
      reason: sortedBag.length === 0 ? 'No clubs in My Bag yet.' : 'None of the suggested areas match your current bag.',
      clubId: null,
      clubLabel: null,
      minutes: 10,
    });
  }

  const notes: string[] = [];
  if (profile.abilityLevel.value === 'brand_new' || profile.abilityLevel.value === 'beginner') {
    notes.push('Short, comfortable swings are fine. This session is for finding a starting point, not passing a test.');
  }
  if (profile.movementComfort.value === 'some_limits' || profile.movementComfort.value === 'prefer_gentle') {
    notes.push('Keep every swing within what feels comfortable. Stop if anything hurts.');
  }
  notes.push(DIAGNOSTIC_NOTE);

  return { items, unavailable, notes, totalMinutes: items.reduce((s, i) => s + i.minutes, 0) };
}
