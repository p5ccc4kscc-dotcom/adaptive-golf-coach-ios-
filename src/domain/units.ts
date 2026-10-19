/**
 * Unit handling. Values are stored in a canonical unit (metres for distance,
 * centimetres for body/club length, degrees for angles) together with the unit
 * the golfer entered, so we can always show the value the way it was given.
 */

export type DistanceUnit = 'yards' | 'metres';
export type LengthUnit = 'in' | 'cm';
export type HeightUnit = 'cm' | 'ft_in';

const METRES_PER_YARD = 0.9144;
const CM_PER_INCH = 2.54;

export const yardsToMetres = (yd: number) => yd * METRES_PER_YARD;
export const metresToYards = (m: number) => m / METRES_PER_YARD;
export const inchesToCm = (inches: number) => inches * CM_PER_INCH;
export const cmToInches = (cm: number) => cm / CM_PER_INCH;

export function toMetres(value: number, unit: DistanceUnit): number {
  return unit === 'yards' ? yardsToMetres(value) : value;
}

export function fromMetres(metres: number, unit: DistanceUnit): number {
  return unit === 'yards' ? metresToYards(metres) : metres;
}

export function toCm(value: number, unit: LengthUnit): number {
  return unit === 'in' ? inchesToCm(value) : value;
}

export function fromCm(cm: number, unit: LengthUnit): number {
  return unit === 'in' ? cmToInches(cm) : cm;
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inchesToCm(feet * 12 + inches);
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cmToInches(cm);
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round((totalInches - feet * 12) * 10) / 10;
  if (inches >= 12) {
    feet += 1;
    inches -= 12;
  }
  return { feet, inches };
}

/**
 * Parses a user-typed number. Accepts "7.5" and "7,5". Returns:
 *  - null for blank input (blank is a valid "not provided" answer)
 *  - NaN for text that is not a finite number
 */
export function parseNumberInput(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const normalised = trimmed.includes('.') ? trimmed.replace(/,/g, '') : trimmed.replace(',', '.');
  if (!/^-?\d*\.?\d+$/.test(normalised)) return Number.NaN;
  const n = Number(normalised);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function round(value: number, decimals = 0): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function formatDistance(metres: number | null, unit: DistanceUnit): string {
  if (metres === null) return 'Unknown';
  const v = round(fromMetres(metres, unit));
  return `${v} ${unit === 'yards' ? 'yd' : 'm'}`;
}

export function formatLength(cm: number | null, unit: LengthUnit): string {
  if (cm === null) return 'Unknown';
  return unit === 'in' ? `${round(cmToInches(cm), 2)} in` : `${round(cm, 1)} cm`;
}

export function formatHeight(cm: number | null, unit: HeightUnit): string {
  if (cm === null) return 'Not provided';
  if (unit === 'cm') return `${round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet} ft ${round(inches, 1)} in`;
}
