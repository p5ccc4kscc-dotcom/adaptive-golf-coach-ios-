import initSqlJs from 'sql.js';
import { randomUUID } from 'node:crypto';

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '@/data/db/migrations';
import { createSqlJsDriver } from '@/data/db/sqljsDriver';
import { createRepositories } from '@/data/repositories';
import { decodeFrames } from '@/domain/pose/decode';
import { detectPhases } from '@/domain/pose/phases';
import { assessPose } from '@/domain/pose/quality';

import { syntheticSwing } from '../fixtures/syntheticSwing';
import { clubFields, openTestApp } from './helpers';

const META = { durationSeconds: 2.67, displayWidth: 1080, displayHeight: 1920, rotationDegrees: 90, nominalFrameRate: 120, estimatedFrameCount: 320, codec: 'hvc1', fileSizeBytes: 12_345_678 };

describe('schema v3 upgrade keeps existing data (fictional)', () => {
  it('a v2 database with a club and a bag opens under v3 with nothing lost', async () => {
    const SQL = await initSqlJs();
    const store: { bytes: Uint8Array | null } = { bytes: null };
    const db = createSqlJsDriver(SQL, { data: null, onWrite: async (b) => void (store.bytes = b) });
    for (const m of MIGRATIONS.filter((m) => m.version <= 2)) {
      await db.exec(m.sql);
      await db.exec(`PRAGMA user_version = ${m.version};`);
    }
    // A v2-era app writes its data.
    const v2 = createRepositories({ db, newId: () => randomUUID(), now: () => new Date('2026-10-01T10:00:00Z') });
    const ownerId = await v2.owner.ensureLocalOwner();
    await v2.catalog.sync();
    const clubId = (await v2.clubs.create(ownerId, clubFields('iron_7', { brand: 'Example Maker A', model: 'Series 7' }))).id;
    const bag = await v2.bags.ensureDefault(ownerId);
    await v2.bags.addClub(bag.id, clubId);

    // The v3 app opens the same file.
    const db3 = createSqlJsDriver(SQL, { data: store.bytes, onWrite: async () => {} });
    const v3 = createRepositories({ db: db3, newId: () => randomUUID(), now: () => new Date('2026-10-20T10:00:00Z') });
    const owner3 = await v3.initialise();
    expect(owner3).toBe(ownerId);
    expect((await db3.get<{ user_version: number }>('PRAGMA user_version;'))?.user_version).toBe(LATEST_SCHEMA_VERSION);
    const clubs = await v3.clubs.list(ownerId);
    expect(clubs.map((c) => [c.typeCode, c.brand, c.model])).toEqual([['iron_7', 'Example Maker A', 'Series 7']]);
    expect(await v3.bags.memberIds((await v3.bags.ensureDefault(ownerId)).id)).toEqual([clubId]);
    expect(await v3.swingVideos.list(ownerId)).toEqual([]);
  });
});

describe('swing videos and analyses (fictional metadata, synthetic frames)', () => {
  it('stores a video with unknowns left null, keeps every analysis run, and survives relaunch', async () => {
    const app = await openTestApp();
    const videoId = await app.repos.swingVideos.add(app.ownerId, { fileUri: 'file:///docs/swing-videos/a.mov', originalFileName: 'IMG_0001.MOV', meta: META, cameraView: null, playingHand: null, clubInstanceId: null, recordedOn: null });
    const v = (await app.repos.swingVideos.get(videoId))!;
    expect(v.cameraView).toBeNull();
    expect(v.playingHand).toBeNull();
    expect(v.meta).toEqual(META);

    await app.repos.poseAnalyses.add(app.ownerId, { swingVideoId: videoId, engine: 'apple_vision_body_pose_2d', engineVersion: '1', appVersion: '0.1.0', params: {}, status: 'cancelled', errorCode: 'ERR_CANCELLED' });
    const { frames: raw } = syntheticSwing({ fps: 120 });
    const frames = decodeFrames(raw);
    const phases = detectPhases(frames, META);
    await app.repos.poseAnalyses.add(app.ownerId, {
      swingVideoId: videoId,
      engine: 'apple_vision_body_pose_2d',
      engineVersion: '1',
      appVersion: '0.1.0',
      params: { maxFramesPerSecond: null },
      status: 'completed',
      decodedFrames: raw.length,
      quality: assessPose(frames),
      phases,
      rawFrames: raw,
      jointOrder: ['nose'],
    });

    const relaunched = await openTestApp(app.store);
    const runs = await relaunched.repos.poseAnalyses.listForVideo(videoId);
    expect(runs.map((r) => r.status).sort()).toEqual(['cancelled', 'completed']);
    const latest = (await relaunched.repos.poseAnalyses.latestCompleted(videoId))!;
    expect(latest.framesAnalysed).toBe(raw.length);
    expect(latest.phases?.candidates.top).toBeDefined();
    const stored = (await relaunched.repos.poseAnalyses.frames(latest.id))!;
    expect(stored.frames).toHaveLength(raw.length);
    expect(stored.frames[10]!.p[0]).toBeCloseTo(raw[10]!.p[0]!, 4);
    expect(await relaunched.repos.poseAnalyses.frames(runs.find((r) => r.status === 'cancelled')!.id)).toBeNull();
  });

  it('a club linked to a video is archived, not deleted; archiving a video keeps its analyses', async () => {
    const app = await openTestApp();
    const clubId = (await app.repos.clubs.create(app.ownerId, clubFields('driver'))).id;
    const videoId = await app.repos.swingVideos.add(app.ownerId, { fileUri: 'file:///x.mov', originalFileName: null, meta: META, cameraView: 'dtl', playingHand: 'left', clubInstanceId: clubId, recordedOn: null });
    expect(await app.repos.clubs.deleteOrArchive(clubId)).toBe('archived');
    await app.repos.poseAnalyses.add(app.ownerId, { swingVideoId: videoId, engine: 'e', engineVersion: '1', appVersion: null, params: {}, status: 'failed', errorCode: 'ERR_VISION_FAILED', errorMessage: 'x' });
    await app.repos.swingVideos.archive(videoId);
    expect(await app.repos.swingVideos.list(app.ownerId)).toEqual([]);
    expect(await app.repos.poseAnalyses.listForVideo(videoId)).toHaveLength(1);
  });

  it('export includes swing data; Delete all my data removes it', async () => {
    const app = await openTestApp();
    const videoId = await app.repos.swingVideos.add(app.ownerId, { fileUri: 'file:///x.mov', originalFileName: null, meta: META, cameraView: 'fo', playingHand: 'right', clubInstanceId: null, recordedOn: null });
    await app.repos.poseAnalyses.add(app.ownerId, { swingVideoId: videoId, engine: 'e', engineVersion: '1', appVersion: null, params: {}, status: 'completed', rawFrames: syntheticSwing({ fps: 30 }).frames, jointOrder: [] });
    const exported = (await app.repos.exportAll(app.ownerId)) as { formatVersion: number; tables: Record<string, unknown[]> };
    expect(exported.formatVersion).toBe(3);
    expect(exported.tables.swing_video).toHaveLength(1);
    expect(exported.tables.pose_analysis).toHaveLength(1);
    expect(exported.tables.pose_frame_data).toHaveLength(1);
    await app.repos.deleteAllData(app.ownerId);
    expect(await app.repos.countOwnerRows(app.ownerId)).toBe(0);
  });
});
