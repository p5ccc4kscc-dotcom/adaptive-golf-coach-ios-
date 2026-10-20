import { useRouter } from 'expo-router';
import { useState } from 'react';

import { CAMERA_VIEW_LABELS } from '@/domain/pose/types';
import { POSE_VERDICT_LABELS } from '@/domain/pose/quality';
import { useQuery, useServices } from '@/services/AppServices';
import { importSwingVideo, swingAnalysisAvailability } from '@/services/swingAnalysis';
import { AppText, Badge, Button, Card, ListRow, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { AnalyseInfo } from '../placeholders/AnalyseScreen';
import { newLocalId, videoSummary } from './format';

/**
 * Analyse tab. In the iPhone app with the GolfVision module this imports swing
 * videos and lists them; anywhere else it says plainly that analysis is not
 * available, and why.
 */
export function AnalyseHome() {
  const availability = swingAnalysisAvailability();
  if (!availability.available) return <AnalyseInfo reason={availability.reason} />;
  return <AnalyseLibrary />;
}

function AnalyseLibrary() {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const data = useQuery(async (s) => {
    const [videos, profile] = await Promise.all([s.repos.swingVideos.list(s.ownerId), s.repos.profile.getProfile(s.ownerId)]);
    const latest = await Promise.all(videos.map((v) => s.repos.poseAnalyses.latestCompleted(v.id)));
    return { videos, latest, hand: profile.playingHand.value };
  }).data;
  const hand = data?.hand === 'right' || data?.hand === 'left' ? data.hand : null;
  const analysed = data ? data.videos.filter((_, i) => data.latest[i]) : [];

  return (
    <Screen testID="analyse" tab title="Analyse" subtitle="Swing videos · on-device Apple Vision">
      <Card tone="info">
        <Stack gap={space.xs}>
          <Badge label="Experimental · M1a prototype" tone="info" />
          <AppText variant="caption">
            Tracks body joints in your own videos on this iPhone; nothing is uploaded. It cannot see the club or ball, and its swing-phase
            timings are candidates for you to check, not verdicts.
          </AppText>
        </Stack>
      </Card>
      <Button
        label="Import a swing video from Photos"
        testID="import-video"
        onPress={async () => {
          setMessage(null);
          const r = await importSwingVideo(repos, ownerId, { playingHand: hand, newId: newLocalId });
          if (r.ok) {
            invalidate();
            router.push(`/analyse/${r.videoId}`);
          } else if (!r.cancelled) setMessage(r.message);
        }}
      />
      {message ? <AppText variant="caption" testID="import-error">{message}</AppText> : null}
      {analysed.length >= 2 ? <Button label="Compare two swings" variant="secondary" onPress={() => router.push('/analyse/compare')} testID="open-compare" /> : null}

      {data && data.videos.length === 0 ? (
        <Card>
          <Stack gap={space.xs}>
            <AppText variant="subheading">No videos yet</AppText>
            <AppText variant="caption" muted>
              Film face-on or down the line with your whole body in view, on a steady support. Slow motion (120–240 fps) gives the best timing.
            </AppText>
          </Stack>
        </Card>
      ) : null}
      <Stack gap={space.sm}>
        {data?.videos.map((v, i) => {
          const a = data.latest[i];
          return (
            <ListRow
              key={v.id}
              title={`${new Date(v.importedAt).toLocaleDateString()} · ${v.cameraView ? CAMERA_VIEW_LABELS[v.cameraView] : 'View not set'}`}
              subtitle={`${videoSummary(v.meta)} · ${a ? (a.quality ? POSE_VERDICT_LABELS[a.quality.verdict] : 'Analysed') : 'Not analysed yet'}`}
              onPress={() => router.push(`/analyse/${v.id}`)}
              testID={`video-${v.id}`}
            />
          );
        })}
      </Stack>
      <NotAvailable title="Club, clubface and ball measurement" detail="Not possible from body tracking. Clubface, path, speeds, spin, launch, carry and strike location are never estimated." />
    </Screen>
  );
}
