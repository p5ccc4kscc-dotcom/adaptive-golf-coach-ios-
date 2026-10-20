/**
 * Storage identifiers. These keep the project's original working name on
 * purpose: changing any of them would orphan data golfers have already saved
 * (the browser's IndexedDB database, the iPhone SQLite file, and the format
 * tag inside exported files). The product name shown to golfers is BadGolfer.
 * Never rename these without an explicit, tested migration.
 */
export const STORAGE_IDS = {
  /** IndexedDB database name used by the browser preview. */
  indexedDbName: 'adaptive-golf-coach',
  /** SQLite file name inside the iPhone app's private documents folder. */
  sqliteFileName: 'adaptive-golf-coach.db',
  /** `format` field written into JSON exports. */
  exportFormat: 'adaptive-golf-coach-export',
} as const;
