/**
 * FICTIONAL TEST FIXTURES — NOT PRODUCTION DATA.
 *
 * These golfers are invented for automated tests only. They must never be
 * imported from `src/`. A test (`noProductionFixtures.test.ts`) enforces this.
 * Brands are placeholders ("Example Maker …"), not real manufacturers.
 */

export const FIXTURE_MARKER = 'FICTIONAL-TEST-FIXTURE';

/** Scenario A: first-time left-handed golfer. */
export const scenarioA = {
  displayName: 'Test Golfer Alpha',
  playingHand: 'left' as const,
  ability: 'beginner' as const,
  clubs: [
    { typeCode: 'driver', brand: 'Example Maker A', model: 'Model One' },
    { typeCode: 'hybrid_5', brand: 'Example Maker B', model: '' },
    { typeCode: 'iron_7', brand: 'Example Maker C', model: 'Series 7' },
    { typeCode: 'iron_9', brand: '', model: '' },
    { typeCode: 'wedge_sw', brand: 'Example Maker D', model: 'Sand Pro' },
    { typeCode: 'putter', brand: 'Example Maker E', model: 'Roller' },
  ],
};

/** Scenario G: 22 owned clubs including duplicates and unusual gear. */
export const scenarioGClubs: { typeCode: string; brand: string; customName?: string; loft?: string }[] = [
  { typeCode: 'driver', brand: 'Example Maker A' },
  { typeCode: 'driver', brand: 'Example Maker B' },
  { typeCode: 'wood_3', brand: 'Example Maker A' },
  { typeCode: 'wood_5', brand: 'Example Maker C' },
  { typeCode: 'hybrid_3', brand: 'Example Maker B' },
  { typeCode: 'hybrid_4', brand: 'Example Maker B' },
  { typeCode: 'utility_iron_2', brand: 'Example Maker D', loft: '16' },
  { typeCode: 'iron_4', brand: 'Example Maker A' },
  { typeCode: 'iron_5', brand: 'Example Maker A' },
  { typeCode: 'iron_6', brand: 'Example Maker A' },
  { typeCode: 'iron_7', brand: 'Example Maker A' },
  { typeCode: 'iron_7', brand: 'Example Maker E' },
  { typeCode: 'iron_8', brand: 'Example Maker A' },
  { typeCode: 'iron_9', brand: 'Example Maker A' },
  { typeCode: 'wedge_pw', brand: 'Example Maker A' },
  { typeCode: 'wedge_other_stamp', brand: 'Example Maker F', customName: 'W' },
  { typeCode: 'wedge_by_loft', brand: 'Example Maker G', loft: '52' },
  { typeCode: 'wedge_by_loft', brand: 'Example Maker G', loft: '56' },
  { typeCode: 'wedge_by_loft', brand: 'Example Maker H', loft: '60' },
  { typeCode: 'chipper', brand: 'Example Maker I', customName: '' },
  { typeCode: 'putter', brand: 'Example Maker J' },
  { typeCode: 'putter', brand: 'Example Maker K' },
];
