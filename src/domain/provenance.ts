/**
 * Every stored fact about a golfer records where it came from.
 *
 * - not_assessed:   never asked or measured (no record exists)
 * - not_provided:   asked, but the golfer skipped it or chose "I don't know"
 * - self_reported:  entered by the golfer
 * - coach_confirmed: confirmed by a named coach
 * - device_measured: measured by this app on this device (e.g. video analysis)
 * - imported:       imported from an external file or device
 */
export const PROVENANCE_VALUES = [
  'not_assessed',
  'not_provided',
  'self_reported',
  'coach_confirmed',
  'device_measured',
  'imported',
] as const;

export type Provenance = (typeof PROVENANCE_VALUES)[number];

export interface Fact<T> {
  value: T | null;
  status: Provenance;
  /** Unit the golfer entered the value in (canonical value is stored separately). */
  unit: string | null;
  /** UTC ISO timestamp when this fact was recorded. */
  recordedAt: string | null;
}

export function notAssessed<T>(): Fact<T> {
  return { value: null, status: 'not_assessed', unit: null, recordedAt: null };
}

export function hasValue<T>(fact: Fact<T> | undefined): fact is Fact<T> & { value: T } {
  return !!fact && fact.value !== null && fact.value !== undefined;
}

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  not_assessed: 'Not assessed',
  not_provided: 'Not provided',
  self_reported: 'Self-reported',
  coach_confirmed: 'Coach confirmed',
  device_measured: 'Measured on device',
  imported: 'Imported',
};
