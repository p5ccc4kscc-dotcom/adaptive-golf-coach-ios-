import { Challenge, PROFILE_FIELD_KEYS, PlayingHand, ballFlightDirectionHint, challengeLabel, emptyProfile, validateBaselineRound } from '@/domain/profile';
import { buildStarterPlanOutline } from '@/domain/starterPlan';
import { makeClub as club } from '../fixtures/clubFactory';
import { ONBOARDING_STEPS, advance, complete, exploreWithEmptyProfile, initialProgress, isSkippable, shouldShowOnboarding } from '@/domain/onboarding';
import { localDateString } from '@/domain/dates';
import { cmToFeetInches, feetInchesToCm, parseNumberInput, toMetres, fromMetres } from '@/domain/units';

describe('empty production profile', () => {
  it('starts every field as not_assessed with no value', () => {
    const p = emptyProfile();
    for (const key of PROFILE_FIELD_KEYS) {
      expect(p[key].status).toBe('not_assessed');
      expect(p[key].value).toBeNull();
    }
  });

  it('does not default handedness to right', () => {
    expect(emptyProfile().playingHand.value).toBeNull();
  });
});

describe('hand-aware ball flight wording', () => {
  it('uses neutral wording when hand is unknown', () => {
    expect(ballFlightDirectionHint(null, 'slice_right')).toBeNull();
    expect(ballFlightDirectionHint('not_sure', 'slice_right')).toBeNull();
    expect(ballFlightDirectionHint('prefer_not_to_say', 'hook_left')).toBeNull();
  });
  it('mirrors directions for left-handed golfers', () => {
    expect(ballFlightDirectionHint('right', 'slice_right')).toBe('curves to the right');
    expect(ballFlightDirectionHint('left', 'slice_right')).toBe('curves to the left');
    expect(ballFlightDirectionHint('left', 'pull')).toBe('starts right of target, little curve');
  });

  const directional: Challenge[] = ['slice_right', 'hook_left', 'push', 'pull'];

  it('right-handed golfers see only right-handed descriptions', () => {
    expect(challengeLabel('slice_right', 'right')).toBe('Slice — curves to the right');
    expect(challengeLabel('hook_left', 'right')).toBe('Hook — curves to the left');
    expect(challengeLabel('push', 'right')).toBe('Push — starts right of target, little curve');
    expect(challengeLabel('pull', 'right')).toBe('Pull — starts left of target, little curve');
    for (const c of directional) expect(challengeLabel(c, 'right')).not.toMatch(/handed|hander/);
  });

  it('left-handed golfers see only left-handed descriptions', () => {
    expect(challengeLabel('slice_right', 'left')).toBe('Slice — curves to the left');
    expect(challengeLabel('hook_left', 'left')).toBe('Hook — curves to the right');
    expect(challengeLabel('push', 'left')).toBe('Push — starts left of target, little curve');
    expect(challengeLabel('pull', 'left')).toBe('Pull — starts right of target, little curve');
    for (const c of directional) expect(challengeLabel(c, 'left')).not.toMatch(/handed|hander/);
  });

  it('unknown hand is never guessed: both directions are explained', () => {
    for (const hand of [null, 'not_sure', 'prefer_not_to_say'] as const) {
      expect(challengeLabel('slice_right', hand)).toBe('Slice — curves right for a right-hander, left for a left-hander');
      expect(challengeLabel('pull', hand)).toBe('Pull — starts left of target for a right-hander, right for a left-hander');
    }
  });

  it('changing hand changes the explanation, including in the starter plan', () => {
    const profile = emptyProfile();
    profile.challenges = { ...profile.challenges, value: ['slice_right'], status: 'self_reported' };
    const reason = (hand: PlayingHand | null) => {
      profile.playingHand = { ...profile.playingHand, value: hand, status: hand ? 'self_reported' : 'not_assessed' };
      return buildStarterPlanOutline(profile, []).unavailable.join(' ') + buildStarterPlanOutline(profile, [club('driver')]).items[0]!.reason;
    };
    expect(reason('right')).toContain('Slice — curves to the right');
    expect(reason('left')).toContain('Slice — curves to the left');
    expect(reason(null)).toContain('for a right-hander, left for a left-hander');
  });

  it('non-directional challenges are worded the same for everyone', () => {
    expect(challengeLabel('putt_pace', 'right')).toBe(challengeLabel('putt_pace', 'left'));
    expect(challengeLabel('putt_pace', null)).toBe('Putt pace');
  });
});

describe('onboarding progression', () => {
  const now = '2026-10-19T10:00:00.000Z';

  it('has the eight required steps in order', () => {
    expect(ONBOARDING_STEPS).toEqual(['welcome', 'experience', 'comfort', 'goals', 'practice', 'clubs', 'baseline', 'review']);
  });

  it('allows skipping every step except welcome and review', () => {
    expect(isSkippable('welcome')).toBe(false);
    expect(isSkippable('review')).toBe(false);
    for (const s of ['experience', 'comfort', 'goals', 'practice', 'clubs', 'baseline'] as const) expect(isSkippable(s)).toBe(true);
  });

  it('records saved and skipped steps and resumes at the next step', () => {
    let p = initialProgress('owner');
    p = advance(p, 'welcome', 'saved', now);
    p = advance(p, 'experience', 'skipped', now);
    expect(p.currentStep).toBe('comfort');
    expect(p.completedSteps).toEqual(['welcome']);
    expect(p.skippedSteps).toEqual(['experience']);
    expect(shouldShowOnboarding(p)).toBe(true);
    p = advance(p, 'experience', 'saved', now);
    expect(p.skippedSteps).toEqual([]);
  });

  it('exploring with an empty profile or completing hides onboarding', () => {
    expect(shouldShowOnboarding(exploreWithEmptyProfile(initialProgress('o'), now))).toBe(false);
    const done = complete(initialProgress('o'), now);
    expect(done.status).toBe('completed');
    expect(shouldShowOnboarding(done)).toBe(false);
  });
});

describe('baseline round validation', () => {
  it('accepts 9-hole rounds as first-class and leaves putts unknown', () => {
    expect(validateBaselineRound({ playedOn: '2026-10-01', holes: 9, totalStrokes: 52, totalPutts: null }, '2026-10-19')).toEqual({});
  });
  it('rejects impossible combinations', () => {
    expect(validateBaselineRound({ playedOn: '2026-10-01', holes: 18, totalStrokes: 10, totalPutts: null }, '2026-10-19').totalStrokes).toBeDefined();
    expect(validateBaselineRound({ playedOn: '2026-10-01', holes: 9, totalStrokes: 40, totalPutts: 41 }, '2026-10-19').totalPutts).toBeDefined();
    expect(validateBaselineRound({ playedOn: '2030-01-01', holes: 9, totalStrokes: null, totalPutts: null }, '2026-10-19').playedOn).toBeDefined();
  });
});

describe('units and dates', () => {
  it('parses user numbers, keeping blank distinct from invalid', () => {
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('  ')).toBeNull();
    expect(parseNumberInput('7,5')).toBe(7.5);
    expect(parseNumberInput('12.25')).toBe(12.25);
    expect(Number.isNaN(parseNumberInput('12x') as number)).toBe(true);
  });
  it('converts distances and heights reversibly', () => {
    expect(fromMetres(toMetres(150, 'yards'), 'yards')).toBeCloseTo(150, 6);
    expect(cmToFeetInches(feetInchesToCm(5, 10))).toEqual({ feet: 5, inches: 10 });
  });
  it('computes the local date in the given zone, not UTC', () => {
    const lateEvening = new Date('2026-10-19T23:30:00Z');
    expect(localDateString(lateEvening, 'UTC')).toBe('2026-10-19');
    expect(localDateString(lateEvening, 'Asia/Tokyo')).toBe('2026-10-20');
    expect(localDateString(lateEvening, 'America/Los_Angeles')).toBe('2026-10-19');
  });
});
