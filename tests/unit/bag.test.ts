import { COMPETITION_BAG_LIMIT, bagCountLabel, canBecomeCompetition, checkAddToBag, checkSwap } from '@/domain/bag';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `club-${i}`);

describe('bag rules', () => {
  it('a competition bag accepts 0 → 14 clubs', () => {
    expect(checkAddToBag('competition', [], 'a', 'active')).toEqual({ ok: true });
    expect(checkAddToBag('competition', ids(13), 'new', 'active')).toEqual({ ok: true });
  });

  it('rejects a 15th club in a competition bag', () => {
    expect(checkAddToBag('competition', ids(14), 'new', 'active')).toEqual({ ok: false, reason: 'limit_reached', limit: 14 });
  });

  it('practice selections may exceed 14 and are labelled as such', () => {
    expect(checkAddToBag('practice', ids(20), 'new', 'active')).toEqual({ ok: true });
    expect(bagCountLabel('practice', 17)).toContain('not an on-course 14-club bag');
    expect(bagCountLabel('competition', 5)).toBe('5 / 14 in bag');
  });

  it('rejects duplicates of the same instance and archived clubs, but allows two clubs of the same type', () => {
    expect(checkAddToBag('competition', ['a'], 'a', 'active')).toEqual({ ok: false, reason: 'already_in_bag' });
    expect(checkAddToBag('competition', [], 'a', 'archived')).toEqual({ ok: false, reason: 'club_archived' });
    // Two different 7-irons are two different instance IDs.
    expect(checkAddToBag('competition', ['seven-iron-maker-a'], 'seven-iron-maker-b', 'active')).toEqual({ ok: true });
  });

  it('swap is allowed at the limit and validated', () => {
    const full = ids(COMPETITION_BAG_LIMIT);
    expect(checkSwap(full, 'club-0', 'new', 'active')).toEqual({ ok: true });
    expect(checkSwap(full, 'missing', 'new', 'active')).toEqual({ ok: false, reason: 'out_not_in_bag' });
    expect(checkSwap(full, 'club-0', 'club-1', 'active')).toEqual({ ok: false, reason: 'in_already_in_bag' });
    expect(checkSwap(full, 'club-0', 'club-0', 'active')).toEqual({ ok: false, reason: 'same_club' });
  });

  it('only a selection of 14 or fewer can become a competition bag', () => {
    expect(canBecomeCompetition(14)).toBe(true);
    expect(canBecomeCompetition(15)).toBe(false);
  });
});
