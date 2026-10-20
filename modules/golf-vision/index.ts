import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { AnalyzeOptions, GolfVisionEvents, NativeExtractedFrame, NativePoseResult, NativeVideoInfo } from './src/GolfVision.types';

export * from './src/GolfVision.types';

declare class GolfVisionNativeModule extends NativeModule<GolfVisionEvents> {
  engine: { name: 'apple_vision_body_pose_2d'; visionRevision: number; jointOrder: string[] };
  probeVideo(uri: string): Promise<NativeVideoInfo>;
  analyzePose(jobId: string, uri: string, options: AnalyzeOptions): Promise<NativePoseResult>;
  cancelAnalysis(jobId: string): void;
  extractFrame(uri: string, seconds: number, maxDimension: number): Promise<NativeExtractedFrame>;
}

/**
 * The native module, or null where it does not exist: the browser preview, Expo Go and tests.
 * Callers must show "not available in this build" when it is null, never a substitute.
 */
export const GolfVision: GolfVisionNativeModule | null = requireOptionalNativeModule<GolfVisionNativeModule>('GolfVision');
