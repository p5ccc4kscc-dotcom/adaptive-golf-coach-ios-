import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { Repositories } from '@/data/repositories';
import { DEFAULT_MIN_CONFIDENCE, decodeFrames } from '@/domain/pose/decode';
import { detectPhases } from '@/domain/pose/phases';
import { assessPose } from '@/domain/pose/quality';
import { SAMPLING, planSampling, swingWindow } from '@/domain/pose/sampling';
import { VideoMeta } from '@/domain/pose/types';

import { AnalysisProgressEvent, GolfVision, NativeVideoInfo } from '../../modules/golf-vision';

/**
 * On-device swing-video import and analysis. Everything here runs on the
 * iPhone: nothing is uploaded. Where the native module is missing (browser
 * preview, Expo Go, tests) `swingAnalysisAvailability()` says so and nothing
 * else in this file may be called.
 */
export type Availability = { available: true } | { available: false; reason: 'browser' | 'not_ios' | 'module_missing' };

export function swingAnalysisAvailability(): Availability {
  if (Platform.OS === 'web') return { available: false, reason: 'browser' };
  if (Platform.OS !== 'ios') return { available: false, reason: 'not_ios' };
  if (!GolfVision) return { available: false, reason: 'module_missing' };
  return { available: true };
}

const VIDEO_DIR = 'swing-videos';

/** The current absolute URI of a stored video (iOS moves the app container on updates). */
export function videoUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

function videoDirectory(): Directory {
  const dir = new Directory(Paths.document, VIDEO_DIR);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function toVideoMeta(n: NativeVideoInfo): VideoMeta {
  return {
    durationSeconds: n.durationSeconds,
    displayWidth: n.displayWidth,
    displayHeight: n.displayHeight,
    rotationDegrees: n.rotationDegrees,
    nominalFrameRate: n.nominalFrameRate,
    estimatedFrameCount: n.estimatedFrameCount,
    codec: n.codec,
    fileSizeBytes: n.fileSizeBytes,
  };
}

export type ImportResult = { ok: true; videoId: string } | { ok: false; cancelled: true } | { ok: false; cancelled: false; message: string };

/**
 * Lets the golfer pick one video from Photos, keeps a private, unmodified copy
 * (passthrough: no re-encoding is requested) and records its real metadata.
 */
export async function importSwingVideo(
  repos: Repositories,
  ownerId: string,
  context: { playingHand: 'right' | 'left' | null; newId: () => string },
): Promise<ImportResult> {
  const native = GolfVision;
  if (!native) return { ok: false, cancelled: false, message: 'The analyser is not part of this build.' };
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    allowsEditing: false,
    allowsMultipleSelection: false,
    videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
    // Lets the picker fetch a video that is stored only in the golfer's iCloud Photos.
    shouldDownloadFromNetwork: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { ok: false, cancelled: true };
  const asset = picked.assets[0];
  try {
    const source = new File(asset.uri);
    const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mov';
    const name = `${context.newId()}.${ext}`;
    const dest = new File(videoDirectory(), name);
    await source.copy(dest);
    removePickerCopy(source);
    const info = await native.probeVideo(dest.uri);
    const videoId = await repos.swingVideos.add(ownerId, {
      relativePath: `${VIDEO_DIR}/${name}`,
      originalFileName: asset.fileName ?? null,
      meta: toVideoMeta(info),
      cameraView: null,
      playingHand: context.playingHand,
      clubInstanceId: null,
      recordedOn: null,
    });
    return { ok: true, videoId };
  } catch (e) {
    return { ok: false, cancelled: false, message: errorMessage(e) };
  }
}

export type RunResult = { status: 'completed'; analysisId: string } | { status: 'cancelled'; analysisId: string } | { status: 'failed'; analysisId: string; message: string };

export interface RunProgress {
  pass: 1 | 2;
  passes: 1 | 2;
  analysed: number;
  estimatedTotal: number;
}

/**
 * Runs Apple Vision over the video (spec §4.1 sampling: one full pass for a
 * short clip; a coarse pass then a full-rate pass over the swing window for a
 * long or slow-motion clip). Every outcome, including failure and
 * cancellation, is recorded.
 */
export async function runSwingAnalysis(
  repos: Repositories,
  ownerId: string,
  video: { id: string; relativePath: string; meta: VideoMeta },
  jobId: string,
  onProgress: (p: RunProgress) => void,
): Promise<RunResult> {
  const native = GolfVision;
  if (!native) throw new Error('The analyser is not part of this build.');
  const plan = planSampling(video.meta);
  const params: Record<string, unknown> = { plan: plan.passes, minConfidence: DEFAULT_MIN_CONFIDENCE, maxFrames: SAMPLING.maxFrames };
  const base = {
    swingVideoId: video.id,
    engine: native.engine.name,
    engineVersion: `vision-rev-${native.engine.visionRevision}`,
    appVersion: Constants.expoConfig?.version ?? null,
    params,
  };
  const uri = videoUri(video.relativePath);
  let pass: 1 | 2 = 1;
  const sub = native.addListener('onAnalysisProgress', (e: AnalysisProgressEvent) => {
    if (e.jobId === jobId) onProgress({ pass, passes: plan.passes, analysed: e.analysed, estimatedTotal: e.estimatedTotal });
  });
  try {
    let result = await native.analyzePose(jobId, uri, plan.passes === 1 ? { maxFrames: SAMPLING.maxFrames } : { maxFramesPerSecond: SAMPLING.coarseFps, maxFrames: SAMPLING.maxFrames });
    const size = { displayWidth: result.video.displayWidth, displayHeight: result.video.displayHeight };
    if (plan.passes === 2) {
      const window = swingWindow(detectPhases(decodeFrames(result.frames), size), result.video.durationSeconds);
      params.coarseFps = SAMPLING.coarseFps;
      if (window) {
        pass = 2;
        params.window = window;
        result = await native.analyzePose(jobId, uri, { maxFrames: SAMPLING.maxFrames, ...window });
      } else {
        params.window = null;
        params.note = 'The coarse pass found no swing, so only the coarse frames were kept.';
      }
    }
    const frames = decodeFrames(result.frames);
    const analysisId = await repos.poseAnalyses.add(ownerId, {
      ...base,
      engineVersion: `vision-rev-${result.visionRevision}`,
      status: 'completed',
      decodedFrames: result.decodedFrames,
      truncated: result.truncated,
      processingSeconds: result.processingSeconds,
      quality: assessPose(frames),
      phases: detectPhases(frames, size),
      rawFrames: result.frames,
      jointOrder: result.jointOrder,
    });
    return { status: 'completed', analysisId };
  } catch (e) {
    const code = errorCode(e);
    if (code === 'ERR_CANCELLED') {
      return { status: 'cancelled', analysisId: await repos.poseAnalyses.add(ownerId, { ...base, status: 'cancelled', errorCode: code }) };
    }
    const message = errorMessage(e);
    return { status: 'failed', message, analysisId: await repos.poseAnalyses.add(ownerId, { ...base, status: 'failed', errorCode: code, errorMessage: message }) };
  } finally {
    sub.remove();
  }
}

export function cancelSwingAnalysis(jobId: string) {
  GolfVision?.cancelAnalysis(jobId);
}

/** The exact analysed frame as an upright JPEG (cached by the native module). */
export async function frameImage(fileUri: string, seconds: number, maxDimension = 1280) {
  if (!GolfVision) throw new Error('The analyser is not part of this build.');
  return GolfVision.extractFrame(fileUri, seconds, maxDimension);
}

/** Frame images the native module extracts for the viewer (derived from the golfer's videos). */
const FRAME_CACHE_DIR = 'golfvision-frames';
/** Where expo-image-picker leaves its temporary copy of a picked video. */
const PICKER_CACHE_DIR = 'ImagePicker';

function deleteDir(parent: Directory, name: string) {
  const dir = new Directory(parent, name);
  if (dir.exists) dir.delete();
}

/** The picker's temporary copy is only deleted when it is inside this app's own cache folder. */
function removePickerCopy(source: File) {
  try {
    if (source.uri.startsWith(Paths.cache.uri) && source.exists) source.delete();
  } catch {
    // A leftover temporary file is also removed by Delete all my data and by iOS cache clean-up.
  }
}

/**
 * Permanently deletes one swing video: the private copy, the extracted frame images, and every
 * analysis, phase mark and landmark record. The original in Photos is not touched.
 */
export async function deleteSwingVideo(repos: Repositories, video: { id: string; relativePath: string }) {
  if (Platform.OS !== 'web') {
    const file = new File(Paths.document, video.relativePath);
    if (file.exists) file.delete();
    // Frame image names are not tied to one video, so the whole regenerable cache is cleared.
    deleteDir(Paths.cache, FRAME_CACHE_DIR);
  }
  await repos.swingVideos.delete(video.id);
}

/** Removes every private video copy and derived image (used by Delete all my data). Photos originals are not touched. */
export function deleteSwingVideoFiles() {
  if (Platform.OS === 'web') return;
  deleteDir(Paths.document, VIDEO_DIR);
  deleteDir(Paths.cache, FRAME_CACHE_DIR);
  deleteDir(Paths.cache, PICKER_CACHE_DIR);
}

export interface SwingStorageUsage {
  videoFiles: number;
  videoBytes: number;
  cachedFiles: number;
  cachedBytes: number;
}

/** What swing-video data is on this device right now, so deletion can be checked in Settings. */
export function swingStorageUsage(): SwingStorageUsage | null {
  if (Platform.OS === 'web') return null;
  const tally = (parent: Directory, name: string) => {
    const dir = new Directory(parent, name);
    let files = 0;
    let bytes = 0;
    if (!dir.exists) return { files, bytes };
    for (const entry of dir.list()) {
      if (entry instanceof File) {
        files += 1;
        bytes += entry.size ?? 0;
      }
    }
    return { files, bytes };
  };
  const videos = tally(Paths.document, VIDEO_DIR);
  const frames = tally(Paths.cache, FRAME_CACHE_DIR);
  const picker = tally(Paths.cache, PICKER_CACHE_DIR);
  return { videoFiles: videos.files, videoBytes: videos.bytes, cachedFiles: frames.files + picker.files, cachedBytes: frames.bytes + picker.bytes };
}

function errorCode(e: unknown): string {
  return typeof e === 'object' && e && 'code' in e && typeof (e as { code: unknown }).code === 'string' ? (e as { code: string }).code : 'ERR_UNKNOWN';
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
