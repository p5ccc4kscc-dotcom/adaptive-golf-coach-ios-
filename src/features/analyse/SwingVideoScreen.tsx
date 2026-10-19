import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';

import { ClubChoice } from '@/domain/baseline';
import { decodeFrames } from '@/domain/pose/decode';
import { NOT_MEASURABLE, NOT_MEASURABLE_REASON, computeMeasurements, formatMeasurement } from '@/domain/pose/measures';
import { PHASES, PHASE_LABELS, applyPhaseMarks } from '@/domain/pose/phases';
import { planSampling } from '@/domain/pose/sampling';
import { POSE_VERDICT_LABELS, assessVideo } from '@/domain/pose/quality';
import { BASIS_LABELS, CAMERA_VIEW_LABELS, CameraView, SHOT_TYPES, SHOT_TYPE_LABELS } from '@/domain/pose/types';
import { useQuery, useServices } from '@/services/AppServices';
import { cancelSwingAnalysis, runSwingAnalysis, swingAnalysisAvailability, videoUri } from '@/services/swingAnalysis';
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
  const [running, setRunning] = useState<{ jobId: string; pass: 1 | 2; passes: 1 | 2; analysed: number; total: number } | null>(null);
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
      const marks = latest ? await s.repos.poseAnalyses.phaseMarks(latest.id) : [];
      const frames = stored ? decodeFrames(stored.frames) : null;
      const phases = latest?.phases && frames ? applyPhaseMarks(latest.phases, marks, frames) : null;
      return { video, runs, latest, frames, phases, marks, owned, bagClubs };
    },
    [videoId],
  ).data;

  const measures = useMemo(() => {
    if (!data?.phases || !data.frames) return null;
    return computeMeasurements(data.frames, data.video.meta, data.phases, { hand: data.video.playingHand, view: data.video.cameraView });
  }, [data]);

  if (data === undefined) return <Screen testID="swing-video"><AppText muted>Loading…</AppText></Screen>;
  if (data === null) return <Screen testID="swing-video"><AppText>This video is no longer available.</AppText></Screen>;
  const { video, runs, latest, frames, phases } = data;
  const videoQuality = assessVideo(video.meta);
  const missingContext = [video.clubChoice === null ? 'the club' : null, video.shotType === null ? 'the shot type' : null, video.cameraView === null ? 'the camera angle' : null].filter(Boolean);
  const currentFrame = frames ? Math.min(frameIndex, frames.length - 1) : 0;
  const usable = latest?.quality && latest.quality.verdict !== 'unusable';
  const clubChoice: ClubChoice | null = video.clubChoice ? { kind: video.clubChoice, clubInstanceId: video.clubInstanceId } : null;

  const analyse = async () => {
    const jobId = newLocalId();
    jobRef.current = jobId;
    setRunMessage(null);
    setRunning({ jobId, pass: 1, passes: planSampling(video.meta).passes, analysed: 0, total: Math.max(1, video.meta.estimatedFrameCount) });
    const r = await runSwingAnalysis(repos, ownerId, video, jobId, (e) => setRunning({ jobId, pass: e.pass, passes: e.passes, analysed: e.analysed, total: e.estimatedTotal }));
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
          <ChoiceChips label="Camera angle" helper="Needed to read 2D angles correctly. Choose “Other angle” if it was neither." options={VIEW_OPTIONS} value={video.cameraView} onChange={async (v: CameraView | null) => { await repos.swingVideos.updateContext(video.id, { cameraView: v }); invalidate(); }} testIDPrefix="view" />
          <ChoiceChips
            label="Playing hand for this swing"
            helper={video.playingHand ? undefined : 'Not set: the lead arm is not identified and nothing is guessed.'}
            options={[{ value: 'right' as const, label: 'Right-handed' }, { value: 'left' as const, label: 'Left-handed' }]}
            value={video.playingHand}
            onChange={async (v) => { await repos.swingVideos.updateContext(video.id, { playingHand: v }); invalidate(); }}
            testIDPrefix="video-hand"
          />
          <ChoiceChips label="Intended shot" options={SHOT_TYPES.map((v) => ({ value: v, label: SHOT_TYPE_LABELS[v] }))} value={video.shotType} onChange={async (v) => { await repos.swingVideos.updateContext(video.id, { shotType: v }); invalidate(); }} testIDPrefix="shot" />
          <ClubPicker
            label="Club used"
            bag={data.bagClubs}
            owned={data.owned}
            value={clubChoice}
            onChange={async (c) => { await repos.swingVideos.updateContext(video.id, { club: c }); invalidate(); }}
            testIDPrefix="video-club"
          />
        </Stack>
      </Card>

      {running ? (
        <Card tone="info" testID="analysis-running">
          <Stack gap={space.sm}>
            <AppText variant="subheading">Analysing on this iPhone…{running.passes === 2 ? ` (pass ${running.pass} of 2: ${running.pass === 1 ? 'finding the swing' : 'full detail'})` : ''}</AppText>
            <ProgressBar value={running.analysed} max={running.total} label={`Analysed ${running.analysed} of about ${running.total} frames`} />
            <AppText variant="caption">{running.analysed} of about {running.total} frames</AppText>
            <Button variant="secondary" label="Cancel" onPress={() => {
                if (jobRef.current) cancelSwingAnalysis(jobRef.current);
              }} testID="cancel-analysis" />
          </Stack>
        </Card>
      ) : (
        <Stack gap={space.xs}>
          <Button label={latest ? 'Analyse again' : 'Analyse on this iPhone'} disabled={!videoQuality.ok || missingContext.length > 0} onPress={analyse} testID="run-analysis" accessibilityHint="Runs Apple Vision body tracking. Earlier results are kept." />
          {missingContext.length > 0 ? <AppText variant="caption" muted>Choose {missingContext.join(', ')} first (“Unknown” and “Other” are fine).</AppText> : <AppText variant="caption" muted>{planSampling(video.meta).reason}</AppText>}
        </Stack>
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

      {frames && frames.length > 0 ? (
        <>
          <PoseFrameViewer fileUri={videoUri(video.relativePath)} frames={frames} size={video.meta} phases={usable ? phases : null} index={currentFrame} onIndexChange={setFrameIndex} testID="pose-viewer" />
          {usable ? (
          <ChoiceChips
            label="Mark this frame as…"
            helper="Your marks replace the automatic candidates and are kept in your history."
            options={PHASES.map((p) => ({ value: p, label: PHASE_LABELS[p] }))}
            value={PHASES.find((p) => data.marks.some((m) => m.phase === p && m.frame === currentFrame)) ?? null}
            onChange={async (p) => {
              if (!p) return;
              await repos.poseAnalyses.markPhase(ownerId, latest!.id, { phase: p, frame: currentFrame, t: frames[currentFrame]!.t });
              invalidate();
            }}
            testIDPrefix="mark"
          />
          ) : (
            <AppText variant="caption">Frames are shown so you can see what went wrong; no phases or measurements are given for this run.</AppText>
          )}
        </>
      ) : null}

      {usable && phases ? (
        <Card testID="phases">
          <Stack gap={space.xs}>
            <AppText variant="subheading">Swing-phase candidates</AppText>
            <AppText variant="caption" muted>Estimated from the hands’ path unless you marked them. Check each against the frame before relying on it.</AppText>
            {PHASES.map((p) => {
              const c = phases.candidates[p];
              const u = phases.unavailable.find((x) => x.phase === p);
              return (
                <Row key={p} wrap gap={space.sm}>
                  <AppText variant="label">{PHASE_LABELS[p]}</AppText>
                  {c ? <AppText>{c.t.toFixed(2)} s ± {c.uncertaintySeconds.toFixed(2)}</AppText> : <AppText muted>Not found</AppText>}
                  {c ? <Badge label={c.confidence === 'manual' ? 'Marked by you' : `${c.confidence} confidence`} tone={c.confidence === 'manual' ? 'primary' : c.confidence === 'medium' ? 'info' : 'warning'} /> : null}
                  {c?.confidence === 'manual' ? <Button compact variant="ghost" label="Use automatic" accessibilityLabel={`Use the automatic ${PHASE_LABELS[p]} candidate`} onPress={async () => { await repos.poseAnalyses.clearPhaseMark(latest!.id, p); invalidate(); }} /> : null}
                  {u ? <AppText variant="caption" muted>{u.reason}</AppText> : null}
                </Row>
              );
            })}
            {phases.notes.map((n) => (
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
