import {
  CLUB_CATEGORIES,
  CLUB_TYPES,
  clubTypesInCategory,
  getClubType,
  resolveStamp,
  searchClubTypes,
} from '@/domain/clubCatalog';

describe('club catalogue completeness', () => {
  const codes = CLUB_TYPES.map((t) => t.code);

  it('has unique, stable codes that are not display names', () => {
    expect(new Set(codes).size).toBe(codes.length);
    for (const t of CLUB_TYPES) {
      expect(t.code).toMatch(/^[a-z0-9_]+$/);
      expect(t.code).not.toBe(t.label);
      expect(t.label.trim()).not.toBe('');
      expect(t.badge.trim()).not.toBe('');
    }
  });

  it.each([
    ['driver', ['driver', 'mini_driver', 'one_wood']],
    ['fairway_wood', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => `wood_${n}`).concat('wood_custom')],
    ['hybrid', [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `hybrid_${n}`).concat('hybrid_custom')],
    ['utility_iron', [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `utility_iron_${n}`).concat('utility_iron_custom')],
    ['iron', [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `iron_${n}`)],
    ['wedge', ['wedge_pw', 'wedge_gw', 'wedge_sw', 'wedge_lw', 'wedge_high_loft', 'wedge_by_loft', 'wedge_other_stamp']],
    ['specialist', ['chipper', 'chipper_putter', 'specialty_other']],
    ['putter', ['putter']],
    ['custom', ['custom']],
  ] as const)('category %s contains every required type', (category, expected) => {
    const inCat = clubTypesInCategory(category).map((t) => t.code);
    for (const code of expected) expect(inCat).toContain(code);
  });

  it('every category has at least one type and every type has a known category', () => {
    for (const c of CLUB_CATEGORIES) expect(clubTypesInCategory(c.category).length).toBeGreaterThan(0);
    for (const t of CLUB_TYPES) expect(CLUB_CATEGORIES.map((c) => c.category)).toContain(t.category);
  });

  it('carries no default lofts, distances or brands', () => {
    for (const t of CLUB_TYPES) {
      const keys = Object.keys(t);
      expect(keys).not.toContain('loft');
      expect(keys).not.toContain('loftDeg');
      expect(keys).not.toContain('distance');
      expect(keys).not.toContain('brand');
    }
  });

  it('keeps driving irons separate from hybrids', () => {
    const di = getClubType('utility_iron_2')!;
    expect(di.category).toBe('utility_iron');
    expect(di.label.toLowerCase()).not.toContain('hybrid');
    expect(di.artwork).toBe('utility_iron');
  });

  it('maps stamped aliases to candidate types without a loft', () => {
    const w = resolveStamp('W');
    expect(w.map((t) => t.code)).toContain('wedge_other_stamp');
    const a = resolveStamp('A');
    expect(a.map((t) => t.code)).toContain('wedge_gw');
    const p = resolveStamp('P');
    expect(p.map((t) => t.code)).toEqual(expect.arrayContaining(['wedge_pw', 'putter']));
    for (const t of [...w, ...a, ...p]) expect((t as unknown as Record<string, unknown>).loftDeg).toBeUndefined();
  });

  it('searches by label and alias', () => {
    expect(searchClubTypes('7-iron').map((t) => t.code)).toContain('iron_7');
    expect(searchClubTypes('lob').map((t) => t.code)).toContain('wedge_lw');
    expect(searchClubTypes('').length).toBe(CLUB_TYPES.length);
  });
});
