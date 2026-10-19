/**
 * Bag rules.
 *
 * My Clubs (owned inventory) and My Bag (an active selection) are separate.
 * The 14-club limit applies only to a *competition* bag preset, never to the
 * owned inventory. Practice selections may be larger but are labelled as not
 * being an on-course 14-club bag. A bag of 0 clubs is valid.
 *
 * The 14-club figure reflects the Rules of Golf at the time of writing; check
 * the current rules at https://www.randa.org/ before publication.
 */

export const COMPETITION_BAG_LIMIT = 14;

export type BagKind = 'competition' | 'practice';

export interface BagPreset {
  id: string;
  ownerId: string;
  name: string;
  kind: BagKind;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export type AddToBagCheck =
  | { ok: true }
  | { ok: false; reason: 'limit_reached'; limit: number }
  | { ok: false; reason: 'already_in_bag' }
  | { ok: false; reason: 'club_archived' };

export function checkAddToBag(
  kind: BagKind,
  currentMemberIds: readonly string[],
  clubId: string,
  clubStatus: 'active' | 'archived',
): AddToBagCheck {
  if (clubStatus === 'archived') return { ok: false, reason: 'club_archived' };
  if (currentMemberIds.includes(clubId)) return { ok: false, reason: 'already_in_bag' };
  if (kind === 'competition' && currentMemberIds.length >= COMPETITION_BAG_LIMIT) {
    return { ok: false, reason: 'limit_reached', limit: COMPETITION_BAG_LIMIT };
  }
  return { ok: true };
}

export type SwapCheck =
  | { ok: true }
  | { ok: false; reason: 'out_not_in_bag' | 'in_already_in_bag' | 'club_archived' | 'same_club' };

export function checkSwap(
  currentMemberIds: readonly string[],
  outId: string,
  inId: string,
  inStatus: 'active' | 'archived',
): SwapCheck {
  if (outId === inId) return { ok: false, reason: 'same_club' };
  if (!currentMemberIds.includes(outId)) return { ok: false, reason: 'out_not_in_bag' };
  if (currentMemberIds.includes(inId)) return { ok: false, reason: 'in_already_in_bag' };
  if (inStatus === 'archived') return { ok: false, reason: 'club_archived' };
  return { ok: true };
}

/** Changing a preset's kind to competition is only allowed if it already fits. */
export function canBecomeCompetition(memberCount: number): boolean {
  return memberCount <= COMPETITION_BAG_LIMIT;
}

export function bagCountLabel(kind: BagKind, count: number): string {
  if (kind === 'competition') return `${count} / ${COMPETITION_BAG_LIMIT} in bag`;
  return `${count} ${count === 1 ? 'club' : 'clubs'} · practice selection — not an on-course 14-club bag`;
}

export function bagLimitMessage(): string {
  return (
    `A competition bag can hold at most ${COMPETITION_BAG_LIMIT} clubs. ` +
    'Remove or swap a club first, or switch to a practice selection.'
  );
}

export function validatePresetName(name: string): string | null {
  const t = name.trim();
  if (!t) return 'Give the bag a name.';
  if (t.length > 40) return 'Keep the name to 40 characters or fewer.';
  return null;
}
