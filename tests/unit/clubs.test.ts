import {
  ClubInstance,
  clubDisplayName,
  emptyClubDraft,
  latestDistance,
  validateClubDraft,
  validateDistanceDraft,
  ClubDistanceObservation,
  draftFromClub,
} from '@/domain/clubs';

const YEAR = 2026;

describe('club form validation', () => {
  it('accepts a club with every optional field blank, leaving them null', () => {
    const r = validateClubDraft(emptyClubDraft('iron_7'), YEAR);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.brand).toBeNull();
    expect(r.value.model).toBeNull();
    expect(r.value.loftDeg).toBeNull();
    expect(r.value.loftStatus).toBe('not_provided');
    expect(r.value.lengthCm).toBeNull();
  });

  it('stores brand and model separately and trims them', () => {
    const d = { ...emptyClubDraft('iron_5'), brand: '  Example Maker A ', model: ' Series  X ' };
    const r = validateClubDraft(d, YEAR);
    expect(r.ok && r.value.brand).toBe('Example Maker A');
    expect(r.ok && r.value.model).toBe('Series X');
  });

  it('records "loft not known" without fabricating a number', () => {
    const r = validateClubDraft({ ...emptyClubDraft('wedge_sw'), loftNotKnown: true }, YEAR);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.loftDeg).toBeNull();
      expect(r.value.loftStatus).toBe('not_known');
    }
  });

  it('rejects impossible lofts and accepts bounded ones', () => {
    expect(validateClubDraft({ ...emptyClubDraft('iron_7'), loft: '95' }, YEAR).ok).toBe(false);
    expect(validateClubDraft({ ...emptyClubDraft('iron_7'), loft: 'abc' }, YEAR).ok).toBe(false);
    const ok = validateClubDraft({ ...emptyClubDraft('utility_iron_2'), loft: '16' }, YEAR);
    expect(ok.ok && ok.value.loftDeg).toBe(16);
  });

  it('requires a loft for wedge-by-loft within wedge bounds', () => {
    expect(validateClubDraft(emptyClubDraft('wedge_by_loft'), YEAR).ok).toBe(false);
    expect(validateClubDraft({ ...emptyClubDraft('wedge_by_loft'), loft: '30' }, YEAR).ok).toBe(false);
    const r = validateClubDraft({ ...emptyClubDraft('wedge_by_loft'), loft: '58' }, YEAR);
    expect(r.ok && r.value.loftDeg).toBe(58);
  });

  it('a "W" stamped wedge keeps its stamp and gets no invented loft', () => {
    const r = validateClubDraft({ ...emptyClubDraft('wedge_other_stamp'), customName: 'W' }, YEAR);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.customName).toBe('W');
      expect(r.value.loftDeg).toBeNull();
      expect(clubDisplayName(r.value)).toBe('Wedge stamped “W”');
    }
  });

  it('custom clubs require a name', () => {
    expect(validateClubDraft(emptyClubDraft('custom'), YEAR).ok).toBe(false);
    const r = validateClubDraft({ ...emptyClubDraft('custom'), customName: 'Training club', customCategory: 'iron' }, YEAR);
    expect(r.ok && r.value.customCategory).toBe('iron');
  });

  it('converts length to cm and validates ranges in both units', () => {
    const inches = validateClubDraft({ ...emptyClubDraft('iron_7'), length: '37', lengthUnit: 'in' }, YEAR);
    expect(inches.ok && Math.round(inches.value.lengthCm! * 10) / 10).toBe(94);
    expect(validateClubDraft({ ...emptyClubDraft('iron_7'), length: '400', lengthUnit: 'cm' }, YEAR).ok).toBe(false);
    expect(validateClubDraft({ ...emptyClubDraft('iron_7'), length: '94', lengthUnit: 'cm' }, YEAR).ok).toBe(true);
  });

  it('rejects unknown club types', () => {
    expect(validateClubDraft(emptyClubDraft('banana'), YEAR).ok).toBe(false);
  });

  it('round-trips a saved club back into the form', () => {
    const r = validateClubDraft({ ...emptyClubDraft('iron_7'), brand: 'Example Maker A', loft: '33.5', length: '37', lengthUnit: 'in' }, YEAR);
    if (!r.ok) throw new Error('expected ok');
    const club: ClubInstance = { ...r.value, id: 'x', ownerId: 'o', status: 'active', archivedAt: null, createdAt: 't', updatedAt: 't' };
    const d = draftFromClub(club);
    expect(d.brand).toBe('Example Maker A');
    expect(d.loft).toBe('33.5');
    expect(d.length).toBe('37');
  });
});

describe('distance observations', () => {
  const base = {
    kind: 'carry' as const,
    method: 'estimated' as const,
    value: '150',
    unit: 'yards' as const,
    observedOn: '2026-10-01',
    source: 'user_estimate' as const,
    context: 'range' as const,
    sampleCount: '',
    notes: '',
  };

  it('stores canonical metres and the entered value/unit', () => {
    const r = validateDistanceDraft(base, '2026-10-19');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.valueM).toBeCloseTo(137.16, 2);
      expect(r.value.enteredValue).toBe(150);
      expect(r.value.enteredUnit).toBe('yards');
      expect(r.value.sampleCount).toBeNull();
    }
  });

  it('rejects blank, negative, absurd and future values', () => {
    expect(validateDistanceDraft({ ...base, value: '' }, '2026-10-19').ok).toBe(false);
    expect(validateDistanceDraft({ ...base, value: '-5' }, '2026-10-19').ok).toBe(false);
    expect(validateDistanceDraft({ ...base, value: '900' }, '2026-10-19').ok).toBe(false);
    expect(validateDistanceDraft({ ...base, observedOn: '2027-01-01' }, '2026-10-19').ok).toBe(false);
  });

  it('a measured distance cannot have "my estimate" as its source', () => {
    expect(validateDistanceDraft({ ...base, method: 'measured' }, '2026-10-19').ok).toBe(false);
    expect(validateDistanceDraft({ ...base, method: 'measured', source: 'range_device' }, '2026-10-19').ok).toBe(true);
  });

  it('latestDistance never mixes kinds or methods and returns null when absent', () => {
    const obs = (id: string, kind: 'carry' | 'total', method: 'estimated' | 'measured', on: string): ClubDistanceObservation => ({
      id,
      ownerId: 'o',
      clubInstanceId: 'c',
      kind,
      method,
      valueM: 100,
      enteredValue: 100,
      enteredUnit: 'metres',
      observedOn: on,
      source: method === 'measured' ? 'range_device' : 'user_estimate',
      context: 'range',
      sampleCount: null,
      notes: null,
      createdAt: on,
    });
    const list = [obs('1', 'carry', 'estimated', '2026-01-01'), obs('2', 'carry', 'measured', '2026-02-01'), obs('3', 'total', 'estimated', '2026-03-01')];
    expect(latestDistance(list, 'carry', 'measured')?.id).toBe('2');
    expect(latestDistance(list, 'carry')?.id).toBe('2');
    expect(latestDistance(list, 'total', 'measured')).toBeNull();
  });
});
