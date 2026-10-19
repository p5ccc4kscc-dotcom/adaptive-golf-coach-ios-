import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { Repositories } from '@/data/repositories';
import { decodeFrames } from '@/domain/pose/decode';
import { detectPhases } from '@/domain/pose/phases';
import { assessPose } from '@/domain/pose/quality';
import { CameraView, VideoMeta } from '@/domain/pose/types';

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
  });
  if (picked.canceled || !picked.assets?.[0]) return { ok: false, cancelled: true };
  const asset = picked.assets[0];
  try {
    const source = new File(asset.uri);
    const ext = (asset.fileName ?? asset.uri).split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mov';
    const dest = new File(videoDirectory(), `${context.newId()}.${ext}`);
    await source.copy(dest);
    const info = await native.probeVideo(dest.uri);
    const videoId = await repos.swingVideos.add(ownerId, {
      fileUri: dest.uri,
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

export interface AnalysisRunOptions {
  /** null = every decoded frame. */
  maxFramesPerSecond: number | null;
  maxFrames: number;
}

export const DEFAULT_RUN: AnalysisRunOptions = { maxFramesPerSecond: null, maxFrames: 1800 };

export type RunResult = { status: 'completed'; analysisId: string } | { status: 'cancelled'; analysisId: string } | { status: 'failed'; analysisId: string; message: string };

/** Runs Apple Vision over the video. Every outcome, including failure and cancellation, is recorded. */
export async function runSwingAnalysis(
  repos: Repositories,
  ownerId: string,
  video: { id: string; fileUri: string; meta: VideoMeta },
  jobId: string,
  onProgress: (e: AnalysisProgressEvent) => void,
  options: AnalysisRunOptions = DEFAULT_RUN,
): Promise<RunResult> {
  const native = GolfVision;
  if (!native) throw new Error('The analyser is not part of this build.');
  const base = {
    swingVideoId: video.id,
    engine: native.engine.name,
    engineVersion: `vision-rev-${native.engine.visionRevision}`,
    appVersion: Constants.expoConfig?.version ?? null,
    params: { ...options, minConfidence: 0.3 } as Record<string, unknown>,
  };
  const sub = native.addListener('onAnalysisProgress', (e) => {
    if (e.jobId === jobId) onProgress(e);
  });
  try {
    const result = await native.analyzePose(jobId, video.fileUri, { maxFramesPerSecond: options.maxFramesPerSecond, maxFrames: options.maxFrames });
    const frames = decodeFrames(result.frames);
    const size = { displayWidth: result.video.displayWidth, displayHeight: result.video.displayHeight };
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

/** Removes the private video copies (used by Delete all my data). The originals in Photos are not touched. */
export function deleteSwingVideoFiles() {
  if (Platform.OS === 'web') return;
  const dir = new Directory(Paths.document, VIDEO_DIR);
  if (dir.exists) dir.delete();
}

export function setVideoView(repos: Repositories, videoId: string, view: CameraView | null) {
  return repos.swingVideos.updateContext(videoId, { cameraView: view });
}

function errorCode(e: unknown): string {
  return typeof e === 'object' && e && 'code' in e && typeof (e as { code: unknown }).code === 'string' ? (e as { code: string }).code : 'ERR_UNKNOWN';
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
