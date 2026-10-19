import { ClubInstance } from '@/domain/clubs';
import { emptyProfile } from '@/domain/profile';
import { buildStarterPlanOutline } from '@/domain/starterPlan';

const club = (id: string, typeCode: string, extra: Partial<ClubInstance> = {}): ClubInstance => ({
  id,
  ownerId: 'o',
  typeCode,
  customName: null,
  customCategory: null,
  customDescription: null,
  brand: null,
  model: null,
  loftDeg: null,
  loftStatus: 'not_provided',
  lengthCm: null,
  lengthUnit: null,
  lieDeg: null,
  shaftBrand: null,
  shaftModel: null,
  shaftFlex: null,
  shaftMaterial: null,
  grip: null,
  condition: null,
  purchaseYear: null,
  notes: null,
  handednessOverride: null,
  putterSubtype: null,
  status: 'active',
  archivedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...extra,
});

describe('starter plan outline', () => {
  it('with an empty bag, suggests a no-club session and never a club drill', () => {
    const plan = buildStarterPlanOutline(emptyProfile(), []);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]!.area).toBe('fundamentals');
    expect(plan.items[0]!.clubId).toBeNull();
    expect(plan.unavailable.length).toBeGreaterThan(0);
  });

  it('only ever references clubs that are in the bag', () => {
    const bag = [club('h5', 'hybrid_5'), club('i7', 'iron_7'), club('p', 'putter')];
    const profile = emptyProfile();
    profile.challenges = { value: ['slice_right', 'bunker_confidence', 'putt_pace'], status: 'self_reported', unit: null, recordedAt: null };
    const plan = buildStarterPlanOutline(profile, bag);
    const ids = new Set(bag.map((c) => c.id));
    for (const item of plan.items) if (item.clubId) expect(ids.has(item.clubId)).toBe(true);
    // No sand wedge: bunker check is reported as unavailable, not invented.
    expect(plan.items.some((i) => i.area === 'bunker')).toBe(false);
    expect(plan.unavailable.join(' ')).toContain('sand wedge');
    // Slice: uses the longest club actually owned (hybrid, no driver).
    expect(plan.items.find((i) => i.area === 'start_line')?.clubLabel).toBe('5-hybrid');
  });

  it('does not claim a fault when nothing was reported', () => {
    const plan = buildStarterPlanOutline(emptyProfile(), [club('p', 'putter')]);
    expect(plan.items[0]!.reason).toContain('No challenges reported');
    expect(plan.notes.join(' ')).toContain('not a diagnosis');
  });
});
