import { PROFILE_FIELD_KEYS, ballFlightDirectionHint, emptyProfile, validateBaselineRound } from '@/domain/profile';
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
  });
  it('mirrors directions for left-handed golfers', () => {
    expect(ballFlightDirectionHint('right', 'slice_right')).toBe('For you: curves to the right');
    expect(ballFlightDirectionHint('left', 'slice_right')).toBe('For you: curves to the left');
    expect(ballFlightDirectionHint('left', 'pull')).toBe('For you: starts right of target');
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
