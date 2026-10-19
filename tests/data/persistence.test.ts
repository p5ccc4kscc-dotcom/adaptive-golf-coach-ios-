import { LATEST_SCHEMA_VERSION } from '@/data/db/migrations';
import { CLUB_TYPES } from '@/domain/clubCatalog';
import { advance, initialProgress } from '@/domain/onboarding';
import { PROFILE_FIELD_KEYS } from '@/domain/profile';

import { scenarioA, scenarioGClubs } from '../fixtures/fictionalGolfers';
import { clubFields, openTestApp } from './helpers';

describe('fresh install', () => {
  it('migrates, syncs the generic catalogue and creates no golfer data', async () => {
    const { db, repos, ownerId } = await openTestApp();
    const v = await db.get<{ user_version: number }>('PRAGMA user_version;');
    expect(Number(v?.user_version)).toBe(LATEST_SCHEMA_VERSION);
    expect(await repos.catalog.count()).toBe(CLUB_TYPES.length);
    expect(await repos.clubs.list(ownerId, { includeArchived: true })).toEqual([]);
    expect(await repos.goals.list(ownerId)).toEqual([]);
    expect(await repos.baseline.list(ownerId)).toEqual([]);
    expect(await repos.bags.list(ownerId)).toEqual([]);
    const profile = await repos.profile.getProfile(ownerId);
    for (const key of PROFILE_FIELD_KEYS) expect(profile[key].status).toBe('not_assessed');
    expect((await repos.onboarding.get(ownerId)).status).toBe('not_started');
  });

  it('the default bag is empty — no club is ever auto-checked', async () => {
    const { repos, ownerId } = await openTestApp();
    await repos.clubs.create(ownerId, clubFields('driver'));
    await repos.clubs.create(ownerId, clubFields('putter'));
    const bag = await repos.bags.ensureDefault(ownerId);
    expect(bag.kind).toBe('competition');
    expect(await repos.bags.members(bag.id)).toEqual([]);
  });

  it('initialise is idempotent across relaunches and keeps the same owner', async () => {
    const first = await openTestApp();
    const second = await openTestApp(first.store);
    expect(second.ownerId).toBe(first.ownerId);
  });
});

describe('Scenario A — left-handed first-time golfer (fictional)', () => {
  it('stores their own answers and exactly the clubs they chose, surviving relaunch', async () => {
    const app = await openTestApp();
    const { repos, ownerId } = app;
    await repos.profile.setFacts(ownerId, {
      displayName: { value: scenarioA.displayName },
      playingHand: { value: scenarioA.playingHand },
      abilityLevel: { value: scenarioA.ability },
      heightCm: { value: null },
      handicap: { value: null },
    });
    const created = [];
    for (const c of scenarioA.clubs) created.push(await repos.clubs.create(ownerId, clubFields(c.typeCode, { brand: c.brand, model: c.model })));
    const bag = await repos.bags.ensureDefault(ownerId);
    for (const c of created.slice(0, 5)) expect((await repos.bags.addClub(bag.id, c.id)).ok).toBe(true);

    // Relaunch
    const relaunched = await openTestApp(app.store);
    const r = relaunched.repos;
    const profile = await r.profile.getProfile(ownerId);
    expect(profile.playingHand.value).toBe('left');
    expect(profile.playingHand.status).toBe('self_reported');
    expect(profile.heightCm.status).toBe('not_provided');
    expect(profile.heightCm.value).toBeNull();
    expect(profile.wristToFloorCm.status).toBe('not_assessed');

    const clubs = await r.clubs.list(ownerId);
    expect(clubs.map((c) => c.typeCode).sort()).toEqual(scenarioA.clubs.map((c) => c.typeCode).sort());
    const nine = clubs.find((c) => c.typeCode === 'iron_9')!;
    expect(nine.brand).toBeNull();
    const active = (await r.bags.getActive(ownerId))!;
    expect(await r.bags.memberIds(active.id)).toHaveLength(5);
  });
});

describe('club inventory', () => {
  it('two 5-irons with different brands are distinct instances', async () => {
    const { repos, ownerId } = await openTestApp();
    const a = await repos.clubs.create(ownerId, clubFields('iron_5', { brand: 'Example Maker A' }));
    const b = await repos.clubs.create(ownerId, clubFields('iron_5', { brand: 'Example Maker B' }));
    expect(a.id).not.toBe(b.id);
    const list = await repos.clubs.list(ownerId);
    expect(list.filter((c) => c.typeCode === 'iron_5').map((c) => c.brand).sort()).toEqual(['Example Maker A', 'Example Maker B']);
    const bag = await repos.bags.ensureDefault(ownerId);
    await repos.bags.addClub(bag.id, b.id);
    expect(await repos.bags.memberIds(bag.id)).toEqual([b.id]);
  });

  it('iron set helper creates only the chosen numbers, one instance each, with editable brands', async () => {
    const { repos, ownerId } = await openTestApp();
    const set = await repos.clubs.createIronSet(ownerId, [5, 7, 8, 9], 'Example Maker A', null);
    expect(set.map((c) => c.typeCode)).toEqual(['iron_5', 'iron_7', 'iron_8', 'iron_9']);
    expect(new Set(set.map((c) => c.id)).size).toBe(4);
    // Replace the brand on one iron only (mixed-brand set).
    const seven = set[1]!;
    await repos.clubs.update(seven.id, clubFields('iron_7', { brand: 'Example Maker B' }));
    const after = await repos.clubs.list(ownerId);
    expect(after.find((c) => c.id === seven.id)!.brand).toBe('Example Maker B');
    expect(after.find((c) => c.typeCode === 'iron_8')!.brand).toBe('Example Maker A');
    expect(after.some((c) => c.typeCode === 'iron_6')).toBe(false);
  });

  it('keeps an edit history snapshot per change', async () => {
    const { repos, ownerId } = await openTestApp();
    const c = await repos.clubs.create(ownerId, clubFields('iron_7', { brand: 'Example Maker A' }));
    await repos.clubs.update(c.id, clubFields('iron_7', { brand: 'Example Maker C', loft: '33' }));
    const revs = await repos.clubs.revisions(c.id);
    expect(revs.map((r) => r.snapshot.brand)).toEqual(['Example Maker A', 'Example Maker C']);
  });

  it('a custom driving iron, unknown-loft wedge and putter are stored without invented values', async () => {
    const { repos, ownerId } = await openTestApp();
    const di = await repos.clubs.create(ownerId, clubFields('utility_iron_custom', { customName: '16° driving iron', loft: '16' }));
    const w = await repos.clubs.create(ownerId, clubFields('wedge_other_stamp', { customName: 'W', loftNotKnown: true }));
    expect(di.typeCode).toBe('utility_iron_custom');
    expect(di.loftDeg).toBe(16);
    expect(w.loftDeg).toBeNull();
    expect(w.loftStatus).toBe('not_known');
  });

  it('deleting a club with history archives it and keeps its distance records', async () => {
    const { repos, ownerId } = await openTestApp();
    const wood = await repos.clubs.create(ownerId, clubFields('wood_5', { brand: 'Example Maker A' }));
    await repos.distances.add(ownerId, wood.id, {
      kind: 'carry',
      method: 'estimated',
      valueM: 150,
      enteredValue: 150,
      enteredUnit: 'metres',
      observedOn: '2026-10-01',
      source: 'user_estimate',
      context: 'range',
      sampleCount: null,
      notes: null,
    });
    const bag = await repos.bags.ensureDefault(ownerId);
    await repos.bags.addClub(bag.id, wood.id);
    expect(await repos.clubs.deleteOrArchive(wood.id)).toBe('archived');
    expect(await repos.clubs.list(ownerId)).toEqual([]);
    expect((await repos.clubs.listArchived(ownerId)).map((c) => c.id)).toEqual([wood.id]);
    expect(await repos.bags.memberIds(bag.id)).toEqual([]);
    expect(await repos.distances.listForClub(wood.id)).toHaveLength(1);
    // Archived clubs cannot be added to a bag until restored.
    expect(await repos.bags.addClub(bag.id, wood.id)).toEqual({ ok: false, reason: 'club_archived' });
    await repos.clubs.restore(wood.id);
    expect((await repos.bags.addClub(bag.id, wood.id)).ok).toBe(true);
  });

  it('deleting a club with no history removes it completely', async () => {
    const { repos, ownerId } = await openTestApp();
    const c = await repos.clubs.create(ownerId, clubFields('hybrid_4'));
    expect(await repos.clubs.deleteOrArchive(c.id)).toBe('deleted');
    expect(await repos.clubs.get(c.id)).toBeNull();
  });

  it('duplicate makes a separate instance', async () => {
    const { repos, ownerId } = await openTestApp();
    const c = await repos.clubs.create(ownerId, clubFields('wedge_by_loft', { loft: '56', brand: 'Example Maker A' }));
    const d = await repos.clubs.duplicate(c.id);
    expect(d.id).not.toBe(c.id);
    expect(d.loftDeg).toBe(56);
  });
});

describe('bag presets and the 14-club rule', () => {
  it('Scenario G (fictional): 22 owned clubs, a 14-club Everyday bag, a 7-club Par-3 preset, 15th rejected', async () => {
    const { repos, ownerId } = await openTestApp();
    const owned = [];
    for (const c of scenarioGClubs) {
      owned.push(
        await repos.clubs.create(
          ownerId,
          clubFields(c.typeCode, { brand: c.brand, customName: c.customName ?? '', loft: c.loft ?? '', loftNotKnown: c.typeCode === 'wedge_other_stamp' }),
        ),
      );
    }
    expect(await repos.clubs.list(ownerId)).toHaveLength(22);

    const everyday = await repos.bags.ensureDefault(ownerId);
    await repos.bags.rename(everyday.id, 'Everyday');
    for (const c of owned.slice(0, 14)) expect((await repos.bags.addClub(everyday.id, c.id)).ok).toBe(true);
    const fifteenth = await repos.bags.addClub(everyday.id, owned[14]!.id);
    expect(fifteenth).toEqual({ ok: false, reason: 'limit_reached', limit: 14 });
    expect(await repos.bags.memberIds(everyday.id)).toHaveLength(14);

    // Swap at the limit.
    expect(await repos.bags.swap(everyday.id, owned[0]!.id, owned[14]!.id)).toEqual({ ok: true });
    const ids = await repos.bags.memberIds(everyday.id);
    expect(ids).toHaveLength(14);
    expect(ids).toContain(owned[14]!.id);
    expect(ids).not.toContain(owned[0]!.id);

    const par3 = await repos.bags.create(ownerId, 'Par-3', 'competition', null);
    if (!par3.ok) throw new Error(par3.error);
    for (const c of owned.slice(10, 17)) await repos.bags.addClub(par3.preset.id, c.id);
    await repos.bags.setActive(ownerId, par3.preset.id);
    expect((await repos.bags.getActive(ownerId))!.name).toBe('Par-3');
    expect(await repos.bags.memberIds(par3.preset.id)).toHaveLength(7);
    // Switching presets leaves the other preset and the inventory untouched.
    expect(await repos.bags.memberIds(everyday.id)).toHaveLength(14);
    expect(await repos.clubs.list(ownerId)).toHaveLength(22);

    // The "W" wedge keeps its stamp with no invented loft.
    const w = (await repos.clubs.list(ownerId)).find((c) => c.typeCode === 'wedge_other_stamp')!;
    expect(w.customName).toBe('W');
    expect(w.loftDeg).toBeNull();
  });

  it('practice selections may exceed 14 but cannot be switched to competition until trimmed', async () => {
    const { repos, ownerId } = await openTestApp();
    const p = await repos.bags.create(ownerId, 'Range day', 'practice', null);
    if (!p.ok) throw new Error(p.error);
    for (let i = 0; i < 16; i++) {
      const c = await repos.clubs.create(ownerId, clubFields('iron_7', { brand: `Example Maker ${i}` }));
      expect((await repos.bags.addClub(p.preset.id, c.id)).ok).toBe(true);
    }
    expect(await repos.bags.setKind(p.preset.id, 'competition')).toMatch(/14 or fewer/);
    const copy = await repos.bags.create(ownerId, 'Copy', 'competition', p.preset.id);
    expect(copy.ok).toBe(false);
  });

  it('removing and clearing keep membership history', async () => {
    const { repos, ownerId } = await openTestApp();
    const bag = await repos.bags.ensureDefault(ownerId);
    const c = await repos.clubs.create(ownerId, clubFields('putter'));
    await repos.bags.addClub(bag.id, c.id);
    await repos.bags.clear(bag.id);
    expect(await repos.bags.memberIds(bag.id)).toEqual([]);
    const h = await repos.bags.history(bag.id);
    expect(h).toHaveLength(1);
    expect(h[0]!.removedAt).not.toBeNull();
    // A club that was in a bag has history, so deletion archives it.
    expect(await repos.clubs.deleteOrArchive(c.id)).toBe('archived');
  });

  it('the last remaining preset cannot be archived', async () => {
    const { repos, ownerId } = await openTestApp();
    const bag = await repos.bags.ensureDefault(ownerId);
    expect(await repos.bags.archive(ownerId, bag.id)).toMatch(/at least one bag/);
  });
});

describe('profile facts', () => {
  it('supersedes rather than overwrites, and ignores unchanged writes', async () => {
    const { repos, ownerId } = await openTestApp();
    await repos.profile.setFacts(ownerId, { abilityLevel: { value: 'beginner' } });
    expect(await repos.profile.setFacts(ownerId, { abilityLevel: { value: 'beginner' } })).toBe(0);
    await repos.profile.setFacts(ownerId, { abilityLevel: { value: 'improving' } });
    const hist = await repos.profile.factHistory(ownerId, 'abilityLevel');
    expect(hist.map((h) => h.value)).toEqual(['beginner', 'improving']);
    expect(hist[0]!.supersededAt).not.toBeNull();
    expect((await repos.profile.getProfile(ownerId)).abilityLevel.value).toBe('improving');
  });

  it('stores canonical height with the entered unit, and handicap kind', async () => {
    const { repos, ownerId } = await openTestApp();
    await repos.profile.setFacts(ownerId, { heightCm: { value: 172.7, unit: 'ft_in' }, handicap: { value: { value: 18.4, kind: 'estimated' } } });
    const p = await repos.profile.getProfile(ownerId);
    expect(p.heightCm.value).toBe(172.7);
    expect(p.heightCm.unit).toBe('ft_in');
    expect(p.handicap.value).toEqual({ value: 18.4, kind: 'estimated' });
  });

  it('goals keep an ordered priority', async () => {
    const { repos, ownerId } = await openTestApp();
    const g1 = await repos.goals.add(ownerId, 'Fewer three-putts', 'No more than 2 three-putts per 18 holes');
    await repos.goals.add(ownerId, 'Keep tee shots playable', '12 of 20 range drives playable');
    await repos.goals.move(ownerId, g1.id, 1);
    expect((await repos.goals.list(ownerId)).map((g) => g.text)).toEqual(['Keep tee shots playable', 'Fewer three-putts']);
  });

  it('onboarding progress persists across relaunch', async () => {
    const app = await openTestApp();
    let p = initialProgress(app.ownerId);
    p = advance(p, 'welcome', 'saved', '2026-10-19T09:00:00Z');
    p = advance(p, 'experience', 'skipped', '2026-10-19T09:01:00Z');
    await app.repos.onboarding.save(p);
    const again = await openTestApp(app.store);
    const loaded = await again.repos.onboarding.get(app.ownerId);
    expect(loaded.currentStep).toBe('comfort');
    expect(loaded.skippedSteps).toEqual(['experience']);
  });
});

describe('baseline, export and delete-all', () => {
  it('stores a nine-hole baseline with unknown putts as null, not zero', async () => {
    const { repos, ownerId } = await openTestApp();
    await repos.baseline.add(ownerId, { playedOn: '2026-10-01', holes: 9, totalStrokes: 51, totalPutts: null, courseName: null, source: 'self_reported', notes: null });
    const [r] = await repos.baseline.list(ownerId);
    expect(r!.holes).toBe(9);
    expect(r!.totalPutts).toBeNull();
  });

  it('exports everything as plain JSON and deletes everything on request', async () => {
    const { repos, ownerId } = await openTestApp();
    const c = await repos.clubs.create(ownerId, clubFields('iron_7', { brand: 'Example Maker A' }));
    const bag = await repos.bags.ensureDefault(ownerId);
    await repos.bags.addClub(bag.id, c.id);
    await repos.profile.setFacts(ownerId, { displayName: { value: 'Test Golfer Beta' } });
    const exported = await repos.exportAll(ownerId);
    const tables = exported.tables as Record<string, unknown[]>;
    expect(exported.format).toBe('adaptive-golf-coach-export');
    expect(tables.club_instance).toHaveLength(1);
    expect(tables.club_bag_membership).toHaveLength(1);
    expect(JSON.parse(JSON.stringify(exported))).toEqual(exported);

    await repos.deleteAllData(ownerId);
    expect(await repos.countOwnerRows(ownerId)).toBe(0);
    expect(await repos.catalog.count()).toBe(CLUB_TYPES.length);
  });
});
