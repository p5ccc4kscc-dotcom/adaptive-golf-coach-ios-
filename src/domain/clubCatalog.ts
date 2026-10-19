/**
 * Generic club-type reference catalogue.
 *
 * These are *types* of club a golfer might own, not owned clubs. Nothing here
 * is ever added to a golfer's inventory automatically. Codes are stable
 * primary keys and must never change once shipped; labels may be reworded.
 *
 * Deliberately absent: default lofts, default distances, brands or set
 * compositions. Category numbers do not imply lofts (marketed naming overlaps).
 */

export const CLUB_CATALOG_VERSION = 1;

export type ClubCategory =
  | 'driver'
  | 'fairway_wood'
  | 'hybrid'
  | 'utility_iron'
  | 'iron'
  | 'wedge'
  | 'specialist'
  | 'putter'
  | 'custom';

export type ClubArtwork =
  | 'driver'
  | 'mini_driver'
  | 'wood'
  | 'hybrid'
  | 'utility_iron'
  | 'iron'
  | 'wedge'
  | 'chipper'
  | 'putter'
  | 'specialty'
  | 'custom';

export interface ClubTypeDefinition {
  /** Stable primary key, e.g. `iron_7`. Never use the label as a key. */
  code: string;
  category: ClubCategory;
  /** Number stamped/marketed on the club, where the type has one. Not a loft. */
  number: number | null;
  label: string;
  /** Short text drawn on the tile artwork, e.g. `7` or `PW`. */
  badge: string;
  artwork: ClubArtwork;
  sortOrder: number;
  /** Stamps or abbreviations a golfer might search for. Never imply a loft. */
  aliases: string[];
  /** Template types ask the golfer for their own name/number. */
  isCustomTemplate: boolean;
  /** For wedge-by-loft entries, the golfer must enter the loft. */
  requiresLoft: boolean;
  /** Optional clarification shown on the add/edit form. */
  note?: string;
}

export interface ClubCategoryInfo {
  category: ClubCategory;
  label: string;
  description: string;
  order: number;
}

export const CLUB_CATEGORIES: readonly ClubCategoryInfo[] = [
  { category: 'driver', label: 'Drivers / tee woods', description: 'Driver, mini-driver and legacy 1-wood.', order: 1 },
  { category: 'fairway_wood', label: 'Fairway woods', description: 'Numbered woods. Numbers are not lofts.', order: 2 },
  { category: 'hybrid', label: 'Hybrids / rescue', description: 'Hybrid or rescue clubs. A driving iron is a separate category.', order: 3 },
  { category: 'utility_iron', label: 'Driving / utility irons', description: 'Iron-style long clubs. Not hybrids.', order: 4 },
  { category: 'iron', label: 'Irons', description: 'Add only the irons you actually own.', order: 5 },
  { category: 'wedge', label: 'Wedges', description: 'By name, by stamp or by loft.', order: 6 },
  { category: 'specialist', label: 'Specialist / short game', description: 'Chippers and other user-defined clubs.', order: 7 },
  { category: 'putter', label: 'Putters', description: 'Blade, mallet or other.', order: 8 },
  { category: 'custom', label: 'Custom / other', description: 'Anything not listed above.', order: 9 },
];

function numbered(
  category: ClubCategory,
  prefix: string,
  numbers: number[],
  makeLabel: (n: number) => string,
  makeBadge: (n: number) => string,
  artwork: ClubArtwork,
  baseOrder: number,
  aliases: (n: number) => string[],
): ClubTypeDefinition[] {
  return numbers.map((n, i) => ({
    code: `${prefix}_${n}`,
    category,
    number: n,
    label: makeLabel(n),
    badge: makeBadge(n),
    artwork,
    sortOrder: baseOrder + i,
    aliases: aliases(n),
    isCustomTemplate: false,
    requiresLoft: false,
  }));
}

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

const base = (
  partial: Omit<ClubTypeDefinition, 'aliases' | 'isCustomTemplate' | 'requiresLoft' | 'number'> &
    Partial<Pick<ClubTypeDefinition, 'aliases' | 'isCustomTemplate' | 'requiresLoft' | 'number'>>,
): ClubTypeDefinition => ({
  number: null,
  aliases: [],
  isCustomTemplate: false,
  requiresLoft: false,
  ...partial,
});

export const CLUB_TYPES: readonly ClubTypeDefinition[] = [
  // Drivers / tee woods
  base({ code: 'driver', category: 'driver', label: 'Driver', badge: 'D', artwork: 'driver', sortOrder: 100, aliases: ['1w', 'dr'] }),
  base({ code: 'mini_driver', category: 'driver', label: 'Mini-driver', badge: 'MD', artwork: 'mini_driver', sortOrder: 101 }),
  base({ code: 'one_wood', category: 'driver', label: '1-wood (legacy)', badge: '1W', artwork: 'wood', sortOrder: 102, number: 1, aliases: ['1 wood', 'persimmon'] }),

  // Fairway woods 2–11 + custom
  ...numbered('fairway_wood', 'wood', range(2, 11), (n) => `${n}-wood`, (n) => `${n}W`, 'wood', 200, (n) => [`${n}w`, `${n} wood`]),
  base({
    code: 'wood_custom',
    category: 'fairway_wood',
    label: 'Other / custom wood',
    badge: 'W?',
    artwork: 'wood',
    sortOrder: 299,
    isCustomTemplate: true,
    note: 'Enter the number or name stamped on the club.',
  }),

  // Hybrids 1–9 + custom
  ...numbered('hybrid', 'hybrid', range(1, 9), (n) => `${n}-hybrid`, (n) => `${n}H`, 'hybrid', 300, (n) => [`${n}h`, `${n} hybrid`, `${n} rescue`]),
  base({
    code: 'hybrid_custom',
    category: 'hybrid',
    label: 'Custom / utility hybrid',
    badge: 'H?',
    artwork: 'hybrid',
    sortOrder: 399,
    isCustomTemplate: true,
    note: 'Enter the number or name stamped on the club.',
  }),

  // Driving / utility irons 1–9 + custom
  ...numbered(
    'utility_iron',
    'utility_iron',
    range(1, 9),
    (n) => `${n}-iron (driving / utility)`,
    (n) => `${n}U`,
    'utility_iron',
    400,
    (n) => [`${n}u`, `${n} utility`, `${n} driving iron`, `di${n}`],
  ),
  base({
    code: 'utility_iron_custom',
    category: 'utility_iron',
    label: 'Custom driving / utility iron',
    badge: 'U?',
    artwork: 'utility_iron',
    sortOrder: 499,
    isCustomTemplate: true,
    note: 'A driving iron stays a driving iron whatever its loft.',
  }),

  // Traditional irons 1–9 (each individually selectable; never auto-added as a set)
  ...numbered('iron', 'iron', range(1, 9), (n) => `${n}-iron`, (n) => `${n}`, 'iron', 500, (n) => [`${n}i`, `${n} iron`]),

  // Wedges
  base({ code: 'wedge_pw', category: 'wedge', label: 'Pitching wedge (PW)', badge: 'PW', artwork: 'wedge', sortOrder: 600, aliases: ['pw', 'p', 'pitching'] }),
  base({
    code: 'wedge_gw',
    category: 'wedge',
    label: 'Gap / approach wedge (GW / AW / UW)',
    badge: 'GW',
    artwork: 'wedge',
    sortOrder: 601,
    aliases: ['gw', 'aw', 'uw', 'a', 'g', 'u', 'gap', 'approach', 'utility wedge'],
  }),
  base({ code: 'wedge_sw', category: 'wedge', label: 'Sand wedge (SW)', badge: 'SW', artwork: 'wedge', sortOrder: 602, aliases: ['sw', 's', 'si', 'sand'] }),
  base({ code: 'wedge_lw', category: 'wedge', label: 'Lob wedge (LW)', badge: 'LW', artwork: 'wedge', sortOrder: 603, aliases: ['lw', 'l', 'lob'] }),
  base({ code: 'wedge_high_loft', category: 'wedge', label: 'Higher-loft wedge', badge: 'XW', artwork: 'wedge', sortOrder: 604, aliases: ['xw', 'high loft'] }),
  base({
    code: 'wedge_by_loft',
    category: 'wedge',
    label: 'Wedge by loft (enter degrees)',
    badge: '°',
    artwork: 'wedge',
    sortOrder: 605,
    requiresLoft: true,
    aliases: ['46', '48', '50', '52', '54', '56', '58', '60', '62', '64', 'degree', 'loft'],
    note: 'Enter the loft stamped on the club.',
  }),
  base({
    code: 'wedge_other_stamp',
    category: 'wedge',
    label: 'Wedge with other stamp (e.g. “W”)',
    badge: 'W',
    artwork: 'wedge',
    sortOrder: 606,
    isCustomTemplate: true,
    aliases: ['w', 'stamp', 'wedge'],
    note: 'Type exactly what is stamped on the sole. The app will not guess its loft.',
  }),

  // Specialist / short game
  base({ code: 'chipper', category: 'specialist', label: 'Chipper', badge: 'CH', artwork: 'chipper', sortOrder: 700, aliases: ['chip'] }),
  base({ code: 'chipper_putter', category: 'specialist', label: 'Chipper-putter', badge: 'CP', artwork: 'chipper', sortOrder: 701 }),
  base({
    code: 'specialty_other',
    category: 'specialist',
    label: 'Specialty / recovery club (user-defined)',
    badge: 'SP',
    artwork: 'specialty',
    sortOrder: 702,
    isCustomTemplate: true,
    note: 'User-defined. The app makes no claim about whether it is legal for competition.',
  }),

  // Putters
  base({ code: 'putter', category: 'putter', label: 'Putter', badge: 'P', artwork: 'putter', sortOrder: 800, aliases: ['putt', 'blade', 'mallet'] }),

  // Custom / other
  base({
    code: 'custom',
    category: 'custom',
    label: 'Custom / other club',
    badge: '?',
    artwork: 'custom',
    sortOrder: 900,
    isCustomTemplate: true,
    note: 'Give it a name, category and optional loft.',
  }),
];

const BY_CODE = new Map(CLUB_TYPES.map((t) => [t.code, t]));

export function getClubType(code: string): ClubTypeDefinition | undefined {
  return BY_CODE.get(code);
}

export function clubTypesInCategory(category: ClubCategory): ClubTypeDefinition[] {
  return CLUB_TYPES.filter((t) => t.category === category).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function categoryInfo(category: ClubCategory): ClubCategoryInfo {
  const info = CLUB_CATEGORIES.find((c) => c.category === category);
  if (!info) throw new Error(`Unknown club category ${category}`);
  return info;
}

/** Case-insensitive search across labels, badges and stamp aliases. */
export function searchClubTypes(query: string): ClubTypeDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...CLUB_TYPES];
  return CLUB_TYPES.filter(
    (t) =>
      t.label.toLowerCase().includes(q) ||
      t.badge.toLowerCase() === q ||
      t.aliases.some((a) => a === q || a.startsWith(q)) ||
      categoryInfo(t.category).label.toLowerCase().includes(q),
  );
}

/**
 * Maps a stamp (e.g. "W", "P", "A", "SW") to candidate catalogue types.
 * Returns candidates only; the golfer confirms. No loft is ever inferred.
 */
export function resolveStamp(stamp: string): ClubTypeDefinition[] {
  const s = stamp.trim().toLowerCase();
  if (!s) return [];
  const matches = CLUB_TYPES.filter((t) => t.aliases.includes(s) || t.badge.toLowerCase() === s);
  return matches.sort((a, b) => a.sortOrder - b.sortOrder);
}

export const PUTTER_SUBTYPES = ['blade', 'mallet', 'other', 'unknown'] as const;
export type PutterSubtype = (typeof PUTTER_SUBTYPES)[number];
