import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { ClubChoice } from '@/domain/baseline';
import { decodeFrames } from '@/domain/pose/decode';
import { NOT_MEASURABLE, NOT_MEASURABLE_REASON, computeMeasurements, formatMeasurement } from '@/domain/pose/measures';
import { PHASES, PHASE_LABELS } from '@/domain/pose/phases';
import { POSE_VERDICT_LABELS, assessVideo } from '@/domain/pose/quality';
import { BASIS_LABELS, CAMERA_VIEW_LABELS, CameraView } from '@/domain/pose/types';
import { useQuery, useServices } from '@/services/AppServices';
import { cancelSwingAnalysis, runSwingAnalysis, swingAnalysisAvailability } from '@/services/swingAnalysis';
import { AppText, Badge, Button, Card, ChoiceChips, Dialog, Disclosure, ProgressBar, Row, Screen, Stack } from '@/ui/components';
import { goBackOr } from '@/ui/navigation';
import { space } from '@/ui/theme';

import { ClubPicker } from '../clubs/ClubPicker';
import { AnalyseInfo } from '../placeholders/AnalyseScreen';
import { newLocalId, videoSummary } from './format';
import { PoseFrameViewer } from './PoseFrameViewer';

const VIEW_OPTIONS = (['fo', 'dtl', 'other'] as const).map((v) => ({ value: v, label: CAMERA_VIEW_LABELS[v] }));

export function SwingVideoScreen({ videoId }: { videoId: string }) {
  const availability = swingAnalysisAvailability();
  if (!availability.available) return <AnalyseInfo reason={availability.reason} />;
  return <SwingVideoDetail videoId={videoId} />;
}

function SwingVideoDetail({ videoId }: { videoId: string }) {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const [running, setRunning] = useState<{ jobId: string; analysed: number; total: number } | null>(null);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const jobRef = useRef<string | null>(null);

  const data = useQuery(
    async (s) => {
      const video = await s.repos.swingVideos.get(videoId);
      if (!video) return null;
      const bag = await s.repos.bags.ensureDefault(s.ownerId);
      const [runs, latest, owned, bagClubs] = await Promise.all([
        s.repos.poseAnalyses.listForVideo(videoId),
        s.repos.poseAnalyses.latestCompleted(videoId),
        s.repos.clubs.list(s.ownerId),
        s.repos.bags.members(bag.id),
      ]);
      const stored = latest ? await s.repos.poseAnalyses.frames(latest.id) : null;
      return { video, runs, latest, frames: stored ? decodeFrames(stored.frames) : null, owned, bagClubs };
    },
    [videoId],
  ).data;

  const measures = useMemo(() => {
    if (!data?.latest?.phases || !data.frames) return null;
    return computeMeasurements(data.frames, data.video.meta, data.latest.phases, { hand: data.video.playingHand, view: data.video.cameraView });
  }, [data]);

  if (data === undefined) return <Screen testID="swing-video"><AppText muted>Loading…</AppText></Screen>;
  if (data === null) return <Screen testID="swing-video"><AppText>This video is no longer available.</AppText></Screen>;
  const { video, runs, latest, frames } = data;
  const videoQuality = assessVideo(video.meta);
  const usable = latest?.quality && latest.quality.verdict !== 'unusable';
  const clubChoice: ClubChoice | null = video.clubInstanceId ? { kind: data.bagClubs.some((c) => c.id === video.clubInstanceId) ? 'bag' : 'other_owned', clubInstanceId: video.clubInstanceId } : null;

  const analyse = async () => {
    const jobId = newLocalId();
    jobRef.current = jobId;
    setRunMessage(null);
    setRunning({ jobId, analysed: 0, total: Math.max(1, video.meta.estimatedFrameCount) });
    const r = await runSwingAnalysis(repos, ownerId, video, jobId, (e) => setRunning({ jobId, analysed: e.analysed, total: e.estimatedTotal }));
    setRunning(null);
    jobRef.current = null;
    setFrameIndex(0);
    setRunMessage(r.status === 'completed' ? null : r.status === 'cancelled' ? 'Analysis cancelled. Nothing was kept from the partial run.' : `Analysis failed: ${r.message}`);
    invalidate();
  };

  return (
    <Screen testID="swing-video">
      <Card>
        <Stack gap={space.xs}>
          <AppText variant="subheading">Video</AppText>
          <AppText variant="caption" testID="video-meta">{videoSummary(video.meta)} · {video.meta.codec}</AppText>
          <AppText variant="caption" muted>Read from the file. Your original stays in Photos, unchanged; BadGolfer keeps a private copy on this iPhone.</AppText>
          {videoQuality.issues.map((i) => (
            <AppText key={i.code} variant="caption">{i.severity === 'block' ? '⛔ ' : i.severity === 'warn' ? '⚠︎ ' : 'ℹ︎ '}{i.message}</AppText>
          ))}
        </Stack>
      </Card>

      <Card>
        <Stack gap={space.sm}>
          <ChoiceChips label="Camera angle" helper="Needed to read 2D angles correctly. Leave blank if unsure." options={VIEW_OPTIONS} value={video.cameraView} onChange={async (v: CameraView | null) => { await repos.swingVideos.updateContext(video.id, { cameraView: v }); invalidate(); }} testIDPrefix="view" />
          <ChoiceChips
            label="Playing hand for this swing"
            helper={video.playingHand ? undefined : 'Not set: the lead arm is not identified and nothing is guessed.'}
            options={[{ value: 'right' as const, label: 'Right-handed' }, { value: 'left' as const, label: 'Left-handed' }]}
            value={video.playingHand}
            onChange={async (v) => { await repos.swingVideos.updateContext(video.id, { playingHand: v }); invalidate(); }}
            testIDPrefix="video-hand"
          />
          <ClubPicker
            label="Club used (optional)"
            bag={data.bagClubs}
            owned={data.owned}
            value={clubChoice}
            onChange={async (c) => { await repos.swingVideos.updateContext(video.id, { clubInstanceId: c && c.kind !== 'unknown' ? c.clubInstanceId : null }); invalidate(); }}
            testIDPrefix="video-club"
          />
        </Stack>
      </Card>

      {running ? (
        <Card tone="info" testID="analysis-running">
          <Stack gap={space.sm}>
            <AppText variant="subheading">Analysing on this iPhone…</AppText>
            <ProgressBar value={running.analysed} max={running.total} label={`Analysed ${running.analysed} of about ${running.total} frames`} />
            <AppText variant="caption">{running.analysed} of about {running.total} frames</AppText>
            <Button variant="secondary" label="Cancel" onPress={() => {
                if (jobRef.current) cancelSwingAnalysis(jobRef.current);
              }} testID="cancel-analysis" />
          </Stack>
        </Card>
      ) : (
        <Button label={latest ? 'Analyse again' : 'Analyse on this iPhone'} disabled={!videoQuality.ok} onPress={analyse} testID="run-analysis" accessibilityHint="Runs Apple Vision body tracking on every frame. Earlier results are kept." />
      )}
      {runMessage ? <AppText variant="caption" testID="analysis-message">{runMessage}</AppText> : null}

      {latest?.quality ? (
        <Card tone={latest.quality.verdict === 'usable' ? 'primary' : 'warning'} testID="pose-quality">
          <Stack gap={space.xs}>
            <AppText variant="subheading">{POSE_VERDICT_LABELS[latest.quality.verdict]}</AppText>
            <AppText variant="caption">
              Person found in {Math.round(latest.quality.detectionRate * 100)}% of {latest.quality.frames} frames{latest.truncated ? ' (stopped at the frame limit)' : ''} · Apple Vision {latest.engineVersion}
            </AppText>
            {latest.quality.issues.map((i) => (
              <AppText key={i.code} variant="caption">⚠︎ {i.message}</AppText>
            ))}
          </Stack>
        </Card>
      ) : null}

      {usable && frames && frames.length > 0 ? (
        <PoseFrameViewer fileUri={video.fileUri} frames={frames} size={video.meta} phases={latest!.phases} index={Math.min(frameIndex, frames.length - 1)} onIndexChange={setFrameIndex} testID="pose-viewer" />
      ) : null}

      {usable && latest?.phases ? (
        <Card testID="phases">
          <Stack gap={space.xs}>
            <AppText variant="subheading">Swing-phase candidates</AppText>
            <AppText variant="caption" muted>Estimated from the hands’ path. Check each against the frame before relying on it.</AppText>
            {PHASES.map((p) => {
              const c = latest.phases!.candidates[p];
              const u = latest.phases!.unavailable.find((x) => x.phase === p);
              return (
                <Row key={p} wrap gap={space.sm}>
                  <AppText variant="label">{PHASE_LABELS[p]}</AppText>
                  {c ? <AppText>{c.t.toFixed(2)} s ± {c.uncertaintySeconds.toFixed(2)}</AppText> : <AppText muted>Not found</AppText>}
                  {c ? <Badge label={`${c.confidence} confidence`} tone={c.confidence === 'medium' ? 'info' : 'warning'} /> : null}
                  {u ? <AppText variant="caption" muted>{u.reason}</AppText> : null}
                </Row>
              );
            })}
            {latest.phases.notes.map((n) => (
              <AppText key={n} variant="caption">ℹ︎ {n}</AppText>
            ))}
          </Stack>
        </Card>
      ) : null}

      {usable && measures ? (
        <Card testID="measurements">
          <Stack gap={space.sm}>
            <AppText variant="subheading">Measurements from this video</AppText>
            <AppText variant="caption" muted>2D, in the picture. Observations only: none of these is a fault, a verdict or proof of a ball flight.</AppText>
            {measures.map((m) => (
              <Stack key={m.id} gap={2}>
                <Row wrap gap={space.sm} style={{ justifyContent: 'space-between' }}>
                  <AppText variant="label" style={{ flex: 1 }}>{m.label}</AppText>
                  <AppText testID={`measure-${m.id}`}>{formatMeasurement(m)}</AppText>
                </Row>
                <AppText variant="caption" muted>{BASIS_LABELS[m.basis]} · {m.note}</AppText>
              </Stack>
            ))}
          </Stack>
        </Card>
      ) : null}

      <Card>
        <Stack gap={space.xs}>
          <AppText variant="subheading">Not measured from body tracking</AppText>
          <AppText variant="caption" muted>{NOT_MEASURABLE_REASON}</AppText>
          <AppText variant="caption">{NOT_MEASURABLE.map((n) => n.label).join(' · ')}</AppText>
        </Stack>
      </Card>

      {runs.length > 0 ? (
        <Disclosure label={`Analysis history (${runs.length})`} openLabel="Hide history" testID="analysis-history">
          {runs.map((r) => (
            <AppText key={r.id} variant="caption">
              {new Date(r.createdAt).toLocaleString()} · {r.status}{r.status === 'completed' ? ` · ${r.framesAnalysed} frames${r.processingSeconds ? ` in ${r.processingSeconds.toFixed(1)} s` : ''}` : r.errorMessage ? ` · ${r.errorMessage}` : ''}
            </AppText>
          ))}
        </Disclosure>
      ) : null}

      <Button variant="danger" label="Remove from BadGolfer" onPress={() => setConfirmRemove(true)} testID="remove-video" />
      <Dialog
        visible={confirmRemove}
        title="Remove this video?"
        message="It disappears from your list. Its analyses are kept in your history and in exports, and the original in Photos is not affected."
        actions={[
          { label: 'Remove', variant: 'danger', onPress: async () => { await repos.swingVideos.archive(video.id); setConfirmRemove(false); invalidate(); goBackOr(router, '/today'); } },
          { label: 'Cancel', onPress: () => setConfirmRemove(false) },
        ]}
        onDismiss={() => setConfirmRemove(false)}
      />
    </Screen>
  );
}
