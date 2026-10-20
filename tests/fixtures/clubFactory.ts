import { ClubInstance } from '@/domain/clubs';

/** Test data only: a blank club instance of the given type. */
export function makeClub(typeCode: string, extra: Partial<ClubInstance> = {}): ClubInstance {
  return {
    id: extra.id ?? `test-${typeCode}`,
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
  };
}
