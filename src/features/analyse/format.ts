import { VideoMeta } from '@/domain/pose/types';

export function videoSummary(m: VideoMeta): string {
  const mb = m.fileSizeBytes === null ? null : m.fileSizeBytes / 1_000_000;
  return [
    `${m.durationSeconds.toFixed(1)} s`,
    `${Math.round(m.nominalFrameRate)} fps`,
    `${m.displayWidth}×${m.displayHeight}`,
    m.displayHeight >= m.displayWidth ? 'portrait' : 'landscape',
    mb === null ? null : `${mb.toFixed(1)} MB`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const newLocalId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
