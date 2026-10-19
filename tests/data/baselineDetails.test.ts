import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { summarisePutts } from '@/domain/baseline';

import { clubFields, openTestApp } from './helpers';

describe('schema migrations', () => {
  it('are append-only and contiguous, ending at the latest version', () => {
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, i) => i + 1));
    expect(LATEST_SCHEMA_VERSION).toBe(3);
  });
});

describe('baseline details (fictional data)', () => {
  it('stores hole-by-hole putts with unrecorded holes kept as null, surviving relaunch', async () => {
    const app = await openTestApp();
    const holePutts = [2, null, 1, 2, null, 3, 2, null, 2];
    await app.repos.baseline.add(app.ownerId, {
      playedOn: '2026-09-01',
      holes: 9,
      totalStrokes: 50,
      totalPutts: 99, // ignored when holePutts given
      holePutts,
      courseName: null,
      source: 'self_reported',
      notes: null,
    });
    const again = await openTestApp(app.store);
    const [r] = await again.repos.baseline.list(again.ownerId);
    expect(r!.holePutts).toEqual(holePutts);
    expect(r!.totalPutts).toBeNull();
    expect(summarisePutts(r!.holePutts!)).toEqual({ holes: 9, recordedHoles: 6, total: 12 });
    await again.repos.baseline.remove(r!.id);
    expect(await again.repos.baseline.list(again.ownerId)).toEqual([]);
  });

  it('records range outcomes by ClubInstanceID or as unknown, and a club with outcomes is archived on delete', async () => {
    const { repos, ownerId } = await openTestApp();
    const seven = await repos.clubs.create(ownerId, clubFields('iron_7', { brand: 'Example Maker A' }));
    await repos.rangeOutcomes.add(ownerId, {
      observedOn: '2026-10-01',
      club: { kind: 'other_owned', clubInstanceId: seven.id },
      context: 'mat_range',
      shots: 20,
      successes: 11,
      successDefinition: 'finished playable',
      notes: null,
      source: 'self_reported',
    });
    await repos.rangeOutcomes.add(ownerId, {
      observedOn: '2026-10-02',
      club: { kind: 'unknown', clubInstanceId: 'ignored' },
      context: 'grass_range',
      shots: 10,
      successes: null,
      successDefinition: null,
      notes: null,
      source: 'self_reported',
    });
    const list = await repos.rangeOutcomes.list(ownerId);
    expect(list.map((o) => o.club)).toEqual([
      { kind: 'unknown', clubInstanceId: null },
      { kind: 'other_owned', clubInstanceId: seven.id },
    ]);
    expect(list[0]!.successes).toBeNull();
    expect(await repos.clubs.deleteOrArchive(seven.id)).toBe('archived');
  });

  it('coach notes are self-reported, archived not deleted, and included in export/delete-all', async () => {
    const { repos, ownerId } = await openTestApp();
    const id = await repos.coachNotes.add(ownerId, { coachName: 'Coach Example', notedOn: '2026-10-05', text: 'Practise start line with a gate', clubInstanceId: null });
    const [n] = await repos.coachNotes.list(ownerId);
    expect(n!.source).toBe('self_reported');
    const exported = (await repos.exportAll(ownerId)).tables as Record<string, unknown[]>;
    expect(exported.golf_coach_note).toHaveLength(1);
    await repos.coachNotes.archive(id);
    expect(await repos.coachNotes.list(ownerId)).toEqual([]);
    expect(((await repos.exportAll(ownerId)).tables as Record<string, unknown[]>).golf_coach_note).toHaveLength(1);
    await repos.deleteAllData(ownerId);
    expect(await repos.countOwnerRows(ownerId)).toBe(0);
  });

  it('skill baselines are superseded, never edited', async () => {
    const { repos, ownerId } = await openTestApp();
    const base = {
      skillId: 'putting.p1.short_conversion',
      level: 1,
      context: 'indoor_mat',
      clubInstanceId: null,
      cameraView: null,
      measurementVersion: 'criteria-v1',
      provenance: 'self_reported' as const,
      summary: { sessions: 3, made: 22, attempts: 30 },
      approvedBy: null,
      approvalRationale: null,
    };
    await repos.skillBaselines.approve(ownerId, base);
    await repos.skillBaselines.approve(ownerId, { ...base, provenance: 'coach_confirmed', approvedBy: 'Coach Example', approvalRationale: 'Deliberate stroke change' });
    const current = await repos.skillBaselines.current(ownerId, base.skillId, 'indoor_mat');
    expect(current!.approvedBy).toBe('Coach Example');
    const history = await repos.skillBaselines.history(ownerId, base.skillId);
    expect(history).toHaveLength(2);
    expect(history[0]!.supersededAt).not.toBeNull();
  });
});
