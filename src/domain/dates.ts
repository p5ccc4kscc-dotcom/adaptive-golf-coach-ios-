/**
 * Dates are persisted as UTC ISO timestamps. Calendar dates the golfer sees
 * (e.g. "played on") are stored as local YYYY-MM-DD in their own time zone.
 * No time zone is hard-coded.
 */

export function nowUtcIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** Local calendar date for `date` in `timeZone` (defaults to the device zone). */
export function localDateString(date: Date, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/** Formats a local YYYY-MM-DD for display using the device locale. */
export function formatLocalDate(ymd: string, locale?: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
