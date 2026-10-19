/**
 * What BadGolfer can and cannot do yet, in one place, so screens never imply
 * that unfinished functionality is available.
 *
 * - available: built and usable in this build.
 * - experimental: built, but not yet validated where it matters (e.g. on a real iPhone).
 * - planned: not built; belongs to the named milestone.
 */
export type FeatureStatus = 'available' | 'experimental' | 'planned';

export interface FeatureInfo {
  id: string;
  name: string;
  status: FeatureStatus;
  milestone: string | null;
  /** One short, plain sentence. */
  detail: string;
}

export const FEATURES: readonly FeatureInfo[] = [
  { id: 'profile', name: 'Golfer profile and setup', status: 'available', milestone: 'M0', detail: 'Every answer optional; blanks stay unknown.' },
  { id: 'clubs', name: 'My Clubs and Build My Bag', status: 'available', milestone: 'M0', detail: 'Brand and model per club, 14-club bags, named setups.' },
  { id: 'baseline', name: 'Baseline rounds and range sessions', status: 'available', milestone: 'M0', detail: 'Self-reported totals or hole-by-hole putts.' },
  { id: 'local_storage', name: 'Private on-device storage', status: 'available', milestone: 'M0', detail: 'Stored only on this device (in this browser for the preview).' },
  { id: 'swing_analysis', name: 'Swing video analysis', status: 'experimental', milestone: 'M1a', detail: 'iPhone app only: on-device Apple Vision body tracking. Not yet tested on a real iPhone; cannot run in the browser.' },
  { id: 'coaching', name: 'Coaching programmes, drills and mastery checks', status: 'planned', milestone: 'M2', detail: 'Needs logged practice evidence and the skills engine.' },
  { id: 'rounds', name: 'Round scorecards, practice logging and trends', status: 'planned', milestone: 'M3', detail: 'Missing values will stay blank, never zero.' },
  { id: 'backup', name: 'Private cloud backup and sync', status: 'planned', milestone: 'M4', detail: 'Not active. Nothing is backed up yet; use Export to keep a copy.' },
];

export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  available: 'Available',
  experimental: 'Experimental',
  planned: 'Planned',
};

export function featuresByStatus(status: FeatureStatus, list: readonly FeatureInfo[] = FEATURES): FeatureInfo[] {
  return list.filter((f) => f.status === status);
}

export function featureBadge(f: FeatureInfo): string {
  return f.milestone && f.status !== 'available' ? `${FEATURE_STATUS_LABELS[f.status]} · ${f.milestone}` : FEATURE_STATUS_LABELS[f.status];
}
