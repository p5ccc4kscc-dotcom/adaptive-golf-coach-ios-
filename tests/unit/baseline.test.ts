import { puttsLabel, roundPuttsText, summarisePutts, validateCoachNote, validateHolePutts, validateRangeOutcome } from '@/domain/baseline';
import { SYNC_STATUS_LABELS, isBackedUp, localOnlySyncProvider } from '@/domain/sync';

describe('hole-by-hole putts', () => {
  it('sums only recorded holes and keeps the denominator (missing is never zero)', () => {
    const s = summarisePutts([2, null, 1, 2, null, 3, 2, null, 2]);
    expect(s).toEqual({ holes: 9, recordedHoles: 6, total: 12 });
    expect(puttsLabel(s)).toBe('12 putts (6/9 holes recorded)');
  });

  it('returns null total when nothing was recorded', () => {
    const s = summarisePutts(Array(18).fill(null));
    expect(s.total).toBeNull();
    expect(puttsLabel(s)).toBe('putts not recorded');
  });

  it('labels a complete card without a denominator and handles totals-only rounds', () => {
    expect(puttsLabel(summarisePutts([1, 2, 2, 1, 2, 2, 1, 2, 2]))).toBe('15 putts');
    expect(roundPuttsText({ holePutts: null, totalPutts: 31 })).toBe('31 putts');
    expect(roundPuttsText({ holePutts: null, totalPutts: null })).toBe('putts not recorded');
  });

  it('validates per-hole values and hole count', () => {
    expect(validateHolePutts([2, 2, 2], 9)).not.toBeNull();
    expect(validateHolePutts([...Array(8).fill(2), 11], 9)).not.toBeNull();
    expect(validateHolePutts([...Array(8).fill(2), null], 9)).toBeNull();
  });
});

describe('range outcomes', () => {
  const ok = { observedOn: '2026-10-01', club: { kind: 'bag' as const, clubInstanceId: 'c1' }, shots: 20, successes: 12, successDefinition: 'finished playable' };

  it('accepts a valid entry, an unknown club and uncounted successes', () => {
    expect(validateRangeOutcome(ok, '2026-10-19')).toEqual({});
    expect(validateRangeOutcome({ ...ok, club: { kind: 'unknown', clubInstanceId: null } }, '2026-10-19')).toEqual({});
    expect(validateRangeOutcome({ ...ok, successes: null, successDefinition: '' }, '2026-10-19')).toEqual({});
  });

  it('requires a club choice, a success definition when counting, and successes ≤ shots', () => {
    expect(validateRangeOutcome({ ...ok, club: null }, '2026-10-19').club).toBeDefined();
    expect(validateRangeOutcome({ ...ok, successDefinition: ' ' }, '2026-10-19').successDefinition).toBeDefined();
    expect(validateRangeOutcome({ ...ok, successes: 21 }, '2026-10-19').successes).toBeDefined();
    expect(validateRangeOutcome({ ...ok, shots: 0 }, '2026-10-19').shots).toBeDefined();
    expect(validateRangeOutcome({ ...ok, observedOn: '2027-01-01' }, '2026-10-19').observedOn).toBeDefined();
  });
});

describe('coach notes', () => {
  it('needs text and a past date', () => {
    expect(validateCoachNote({ notedOn: '2026-10-01', text: 'Keep the head steady' }, '2026-10-19')).toEqual({});
    expect(validateCoachNote({ notedOn: '2026-10-01', text: '' }, '2026-10-19').text).toBeDefined();
    expect(validateCoachNote({ notedOn: '2030-01-01', text: 'x' }, '2026-10-19').notedOn).toBeDefined();
  });
});

describe('sync provider (local only)', () => {
  it('reports explicit, non-backed-up states and never claims a backup', async () => {
    const ios = await localOnlySyncProvider('ios').getState();
    const web = await localOnlySyncProvider('web').getState();
    expect(ios.status).toBe('icloud_not_configured');
    expect(web.status).toBe('local_only');
    expect(isBackedUp(ios)).toBe(false);
    expect(isBackedUp(web)).toBe(false);
    expect(Object.keys(SYNC_STATUS_LABELS).sort()).toEqual(['conflict', 'icloud_not_configured', 'local_only', 'sync_failed', 'synced', 'syncing']);
  });
});
