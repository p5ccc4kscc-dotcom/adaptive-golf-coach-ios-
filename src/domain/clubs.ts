import {
  CLUB_CATEGORIES,
  ClubCategory,
  ClubTypeDefinition,
  PUTTER_SUBTYPES,
  PutterSubtype,
  getClubType,
} from './clubCatalog';
import { DistanceUnit, LengthUnit, parseNumberInput, toCm, toMetres } from './units';

/**
 * An individual club the golfer owns (or has owned). Identity is the UUID `id`
 * (ClubInstanceID), which is distinct from the generic `typeCode`
 * (ClubTypeID), so two 7-irons of different brands are separate clubs with
 * separate histories.
 */
export interface ClubInstance {
  id: string;
  ownerId: string;
  typeCode: string;
  /** Golfer-entered name/stamp for template types (custom club, other wood, "W" wedge…). */
  customName: string | null;
  /** For fully custom clubs only: which category it behaves like. */
  customCategory: ClubCategory | null;
  customDescription: string | null;
  brand: string | null;
  model: string | null;
  loftDeg: number | null;
  /** `known` only when the golfer typed a loft. Never guessed from brand/model/type. */
  loftStatus: 'known' | 'not_known' | 'not_provided';
  lengthCm: number | null;
  lengthUnit: LengthUnit | null;
  lieDeg: number | null;
  shaftBrand: string | null;
  shaftModel: string | null;
  shaftFlex: string | null;
  shaftMaterial: string | null;
  grip: string | null;
  condition: string | null;
  purchaseYear: number | null;
  notes: string | null;
  handednessOverride: 'right' | 'left' | null;
  putterSubtype: PutterSubtype | null;
  status: 'active' | 'archived';
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Raw form state: everything is a string so blanks stay blank. */
export interface ClubDraft {
  typeCode: string;
  customName: string;
  customCategory: ClubCategory | '';
  customDescription: string;
  brand: string;
  model: string;
  loft: string;
  loftNotKnown: boolean;
  length: string;
  lengthUnit: LengthUnit;
  lie: string;
  shaftBrand: string;
  shaftModel: string;
  shaftFlex: string;
  shaftMaterial: string;
  grip: string;
  condition: string;
  purchaseYear: string;
  notes: string;
  handednessOverride: 'right' | 'left' | '';
  putterSubtype: PutterSubtype | '';
}

export type ClubFields = Omit<ClubInstance, 'id' | 'ownerId' | 'status' | 'archivedAt' | 'createdAt' | 'updatedAt'>;

export const SHAFT_FLEX_OPTIONS = ['Ladies', 'Senior', 'Regular', 'Stiff', 'Extra stiff', 'Other', 'Unknown'] as const;
export const SHAFT_MATERIAL_OPTIONS = ['Steel', 'Graphite', 'Other', 'Unknown'] as const;
export const CONDITION_OPTIONS = ['New', 'Good', 'Worn', 'Needs attention', 'Unknown'] as const;

export const LOFT_LIMITS = { min: 0, max: 80 } as const;
export const WEDGE_BY_LOFT_LIMITS = { min: 40, max: 72 } as const;
export const LIE_LIMITS = { min: 40, max: 90 } as const;
/** Club length in inches (covers junior clubs through long putters). */
export const LENGTH_LIMITS_IN = { min: 15, max: 60 } as const;
export const TEXT_MAX = 80;
export const NOTES_MAX = 1000;

export const WEDGE_LOFT_SUGGESTIONS = [46, 48, 50, 52, 54, 56, 58, 60, 62, 64] as const;

export function emptyClubDraft(typeCode: string, defaultLengthUnit: LengthUnit = 'in'): ClubDraft {
  return {
    typeCode,
    customName: '',
    customCategory: '',
    customDescription: '',
    brand: '',
    model: '',
    loft: '',
    loftNotKnown: false,
    length: '',
    lengthUnit: defaultLengthUnit,
    lie: '',
    shaftBrand: '',
    shaftModel: '',
    shaftFlex: '',
    shaftMaterial: '',
    grip: '',
    condition: '',
    purchaseYear: '',
    notes: '',
    handednessOverride: '',
    putterSubtype: '',
  };
}

const LENGTH_DECIMALS: Record<LengthUnit, number> = { in: 2, cm: 1 };

export function draftFromClub(club: ClubInstance): ClubDraft {
  const unit = club.lengthUnit ?? 'in';
  const lengthValue =
    club.lengthCm === null ? '' : String(Number((unit === 'in' ? club.lengthCm / 2.54 : club.lengthCm).toFixed(LENGTH_DECIMALS[unit])));
  return {
    typeCode: club.typeCode,
    customName: club.customName ?? '',
    customCategory: club.customCategory ?? '',
    customDescription: club.customDescription ?? '',
    brand: club.brand ?? '',
    model: club.model ?? '',
    loft: club.loftDeg === null ? '' : String(club.loftDeg),
    loftNotKnown: club.loftStatus === 'not_known',
    length: lengthValue,
    lengthUnit: unit,
    lie: club.lieDeg === null ? '' : String(club.lieDeg),
    shaftBrand: club.shaftBrand ?? '',
    shaftModel: club.shaftModel ?? '',
    shaftFlex: club.shaftFlex ?? '',
    shaftMaterial: club.shaftMaterial ?? '',
    grip: club.grip ?? '',
    condition: club.condition ?? '',
    purchaseYear: club.purchaseYear === null ? '' : String(club.purchaseYear),
    notes: club.notes ?? '',
    handednessOverride: club.handednessOverride ?? '',
    putterSubtype: club.putterSubtype ?? '',
  };
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const cleanText = (s: string, max = TEXT_MAX): string | null => {
  const t = s.trim().replace(/\s+/g, ' ');
  return t === '' ? null : t.slice(0, max);
};

/** Validates a club form. Blank optional fields stay null; nothing is guessed. */
export function validateClubDraft(draft: ClubDraft, currentYear: number): ValidationResult<ClubFields> {
  const errors: Record<string, string> = {};
  const type = getClubType(draft.typeCode);
  if (!type) {
    return { ok: false, errors: { typeCode: 'Choose a club type.' } };
  }

  const customName = cleanText(draft.customName);
  if (type.code === 'custom' && !customName) {
    errors.customName = 'Give your custom club a name.';
  }
  if (type.code === 'wedge_other_stamp' && !customName) {
    errors.customName = 'Type what is stamped on the club (for example “W”).';
  }
  let customCategory: ClubCategory | null = null;
  if (type.code === 'custom') {
    if (draft.customCategory && CLUB_CATEGORIES.some((c) => c.category === draft.customCategory)) {
      customCategory = draft.customCategory;
    } else if (draft.customCategory) {
      errors.customCategory = 'Choose a valid category.';
    }
  }

  // Loft: optional, unless the type is "wedge by loft". Never inferred.
  let loftDeg: number | null = null;
  let loftStatus: ClubFields['loftStatus'] = 'not_provided';
  const loft = parseNumberInput(draft.loft);
  if (draft.loftNotKnown && loft === null) {
    loftStatus = 'not_known';
  } else if (loft !== null) {
    const limits = type.requiresLoft ? WEDGE_BY_LOFT_LIMITS : LOFT_LIMITS;
    if (Number.isNaN(loft)) {
      errors.loft = 'Loft must be a number of degrees.';
    } else if (loft < limits.min || loft > limits.max) {
      errors.loft = `Loft must be between ${limits.min}° and ${limits.max}°.`;
    } else {
      loftDeg = Math.round(loft * 10) / 10;
      loftStatus = 'known';
    }
  }
  if (type.requiresLoft && loftStatus !== 'known' && !errors.loft) {
    errors.loft = 'Enter the loft for a wedge-by-loft club, or choose a named wedge instead.';
  }

  let lengthCm: number | null = null;
  let lengthUnit: LengthUnit | null = null;
  const length = parseNumberInput(draft.length);
  if (length !== null) {
    if (Number.isNaN(length)) {
      errors.length = 'Length must be a number.';
    } else {
      const inches = draft.lengthUnit === 'in' ? length : length / 2.54;
      if (inches < LENGTH_LIMITS_IN.min || inches > LENGTH_LIMITS_IN.max) {
        errors.length =
          draft.lengthUnit === 'in'
            ? `Length must be between ${LENGTH_LIMITS_IN.min} and ${LENGTH_LIMITS_IN.max} in.`
            : `Length must be between ${Math.round(LENGTH_LIMITS_IN.min * 2.54)} and ${Math.round(LENGTH_LIMITS_IN.max * 2.54)} cm.`;
      } else {
        lengthCm = toCm(length, draft.lengthUnit);
        lengthUnit = draft.lengthUnit;
      }
    }
  }

  let lieDeg: number | null = null;
  const lie = parseNumberInput(draft.lie);
  if (lie !== null) {
    if (Number.isNaN(lie) || lie < LIE_LIMITS.min || lie > LIE_LIMITS.max) {
      errors.lie = `Lie must be between ${LIE_LIMITS.min}° and ${LIE_LIMITS.max}°.`;
    } else {
      lieDeg = Math.round(lie * 10) / 10;
    }
  }

  let purchaseYear: number | null = null;
  const year = parseNumberInput(draft.purchaseYear);
  if (year !== null) {
    if (Number.isNaN(year) || !Number.isInteger(year) || year < 1900 || year > currentYear + 1) {
      errors.purchaseYear = `Year must be between 1900 and ${currentYear + 1}.`;
    } else {
      purchaseYear = year;
    }
  }

  const putterSubtype =
    type.category === 'putter' && draft.putterSubtype && (PUTTER_SUBTYPES as readonly string[]).includes(draft.putterSubtype)
      ? draft.putterSubtype
      : null;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      typeCode: type.code,
      customName: type.isCustomTemplate ? customName : null,
      customCategory,
      customDescription: type.code === 'custom' ? cleanText(draft.customDescription, NOTES_MAX) : null,
      brand: cleanText(draft.brand),
      model: cleanText(draft.model),
      loftDeg,
      loftStatus,
      lengthCm,
      lengthUnit,
      lieDeg,
      shaftBrand: cleanText(draft.shaftBrand),
      shaftModel: cleanText(draft.shaftModel),
      shaftFlex: cleanText(draft.shaftFlex),
      shaftMaterial: cleanText(draft.shaftMaterial),
      grip: cleanText(draft.grip),
      condition: cleanText(draft.condition),
      purchaseYear,
      notes: cleanText(draft.notes, NOTES_MAX),
      handednessOverride: draft.handednessOverride === '' ? null : draft.handednessOverride,
      putterSubtype,
    },
  };
}

/** Name shown for a club: golfer's own name for templates, loft for wedge-by-loft. */
export function clubDisplayName(club: Pick<ClubInstance, 'typeCode' | 'customName' | 'loftDeg'>): string {
  const type = getClubType(club.typeCode);
  if (!type) return club.customName ?? 'Unknown club type';
  if (type.code === 'wedge_by_loft' && club.loftDeg !== null) return `${club.loftDeg}° wedge`;
  if (type.code === 'wedge_other_stamp' && club.customName) return `Wedge stamped “${club.customName}”`;
  if (type.isCustomTemplate && club.customName) return club.customName;
  return type.label;
}

export function clubBadge(club: Pick<ClubInstance, 'typeCode' | 'customName' | 'loftDeg'>): string {
  const type = getClubType(club.typeCode);
  if (!type) return '?';
  if (type.code === 'wedge_by_loft' && club.loftDeg !== null) return `${club.loftDeg}°`;
  if (type.isCustomTemplate && club.customName) return club.customName.slice(0, 3).toUpperCase();
  return type.badge;
}

export function effectiveCategory(club: Pick<ClubInstance, 'typeCode' | 'customCategory'>): ClubCategory {
  const type = getClubType(club.typeCode);
  if (type?.code === 'custom' && club.customCategory) return club.customCategory;
  return type?.category ?? 'custom';
}

export function clubTypeOf(club: Pick<ClubInstance, 'typeCode'>): ClubTypeDefinition | undefined {
  return getClubType(club.typeCode);
}

/** Sort clubs in conventional bag order (longest to shortest), then by creation. */
export function compareClubs(a: ClubInstance, b: ClubInstance): number {
  const ta = getClubType(a.typeCode)?.sortOrder ?? 9999;
  const tb = getClubType(b.typeCode)?.sortOrder ?? 9999;
  if (ta !== tb) return ta - tb;
  if (a.loftDeg !== null && b.loftDeg !== null && a.loftDeg !== b.loftDeg) return a.loftDeg - b.loftDeg;
  return a.createdAt.localeCompare(b.createdAt);
}

// ---------------------------------------------------------------------------
// Distance observations
// ---------------------------------------------------------------------------

export type DistanceKind = 'carry' | 'total';
export type DistanceMethod = 'estimated' | 'measured';
export type DistanceSource = 'user_estimate' | 'range_device' | 'launch_monitor' | 'course_measurement' | 'gps_device' | 'other';
export type DistanceContext = 'range' | 'course' | 'indoor' | 'unknown';

export interface ClubDistanceObservation {
  id: string;
  ownerId: string;
  clubInstanceId: string;
  kind: DistanceKind;
  method: DistanceMethod;
  /** Canonical metres. */
  valueM: number;
  enteredValue: number;
  enteredUnit: DistanceUnit;
  /** Local calendar date (YYYY-MM-DD) in the golfer's time zone. */
  observedOn: string;
  source: DistanceSource;
  context: DistanceContext;
  sampleCount: number | null;
  notes: string | null;
  createdAt: string;
}

export interface DistanceDraft {
  kind: DistanceKind;
  method: DistanceMethod;
  value: string;
  unit: DistanceUnit;
  observedOn: string;
  source: DistanceSource;
  context: DistanceContext;
  sampleCount: string;
  notes: string;
}

/** 450 yards: above any realistic single-club distance; catches typing errors. */
export const DISTANCE_MAX_M = 411.5;

export const DISTANCE_SOURCE_LABELS: Record<DistanceSource, string> = {
  user_estimate: 'My estimate',
  range_device: 'Range device / rangefinder',
  launch_monitor: 'Launch monitor (imported reading)',
  course_measurement: 'Measured on course',
  gps_device: 'GPS device',
  other: 'Other',
};

export const DISTANCE_CONTEXT_LABELS: Record<DistanceContext, string> = {
  range: 'Range',
  course: 'Course',
  indoor: 'Indoor',
  unknown: 'Unknown',
};

export function validateDistanceDraft(
  draft: DistanceDraft,
  todayLocal: string,
): ValidationResult<Omit<ClubDistanceObservation, 'id' | 'ownerId' | 'clubInstanceId' | 'createdAt'>> {
  const errors: Record<string, string> = {};
  const v = parseNumberInput(draft.value);
  let valueM = 0;
  if (v === null) errors.value = 'Enter a distance.';
  else if (Number.isNaN(v) || v <= 0) errors.value = 'Distance must be a positive number.';
  else {
    valueM = toMetres(v, draft.unit);
    if (valueM > DISTANCE_MAX_M) errors.value = 'That distance is longer than any single club shot we accept. Check the value and unit.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.observedOn)) errors.observedOn = 'Date must be YYYY-MM-DD.';
  else if (draft.observedOn > todayLocal) errors.observedOn = 'Date cannot be in the future.';
  if (draft.method === 'measured' && draft.source === 'user_estimate') {
    errors.source = 'A measured distance needs a measuring source. Choose “Estimated” if this is your estimate.';
  }
  let sampleCount: number | null = null;
  const sc = parseNumberInput(draft.sampleCount);
  if (sc !== null) {
    if (Number.isNaN(sc) || !Number.isInteger(sc) || sc < 1 || sc > 10000) errors.sampleCount = 'Shots must be a whole number of 1 or more.';
    else sampleCount = sc;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      kind: draft.kind,
      method: draft.method,
      valueM,
      enteredValue: v as number,
      enteredUnit: draft.unit,
      observedOn: draft.observedOn,
      source: draft.source,
      context: draft.context,
      sampleCount,
      notes: draft.notes.trim() === '' ? null : draft.notes.trim().slice(0, NOTES_MAX),
    },
  };
}

/** Most recent observation of a given kind/method, or null. Never interpolated. */
export function latestDistance(
  observations: ClubDistanceObservation[],
  kind: DistanceKind,
  method?: DistanceMethod,
): ClubDistanceObservation | null {
  const filtered = observations.filter((o) => o.kind === kind && (method === undefined || o.method === method));
  if (filtered.length === 0) return null;
  return [...filtered].sort((a, b) => (a.observedOn === b.observedOn ? b.createdAt.localeCompare(a.createdAt) : b.observedOn.localeCompare(a.observedOn)))[0]!;
}
