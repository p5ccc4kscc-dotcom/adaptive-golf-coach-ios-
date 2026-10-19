import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { compareAnalyses } from '@/domain/pose/compare';
import { decodeFrames } from '@/domain/pose/decode';
import { Measurement, computeMeasurements, formatMeasurement } from '@/domain/pose/measures';
import { PHASES, PHASE_LABELS, PhaseName } from '@/domain/pose/phases';
import { CAMERA_VIEW_LABELS, PoseFrame } from '@/domain/pose/types';
import { PoseAnalysisRecord, SwingVideo } from '@/data/repositories/swingRepository';
import { useQuery } from '@/services/AppServices';
import { swingAnalysisAvailability } from '@/services/swingAnalysis';
import { AppText, Card, ChoiceChips, Row, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { AnalyseInfo } from '../placeholders/AnalyseScreen';
import { PoseFrameStill } from './PoseFrameViewer';

interface Analysed {
  video: SwingVideo;
  analysis: PoseAnalysisRecord;
  frames: PoseFrame[];
  measures: Measurement[];
}

export function CompareScreen() {
  const availability = swingAnalysisAvailability();
  if (!availability.available) return <AnalyseInfo reason={availability.reason} />;
  return <CompareDetail />;
}

function CompareDetail() {
  const { width } = useWindowDimensions();
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PhaseName>('top');
  const list = useQuery(async (s) => {
    const videos = await s.repos.swingVideos.list(s.ownerId);
    const out: Analysed[] = [];
    for (const video of videos) {
      const analysis = await s.repos.poseAnalyses.latestCompleted(video.id);
      if (!analysis?.phases || analysis.quality?.verdict === 'unusable') continue;
      const stored = await s.repos.poseAnalyses.frames(analysis.id);
      if (!stored) continue;
      const frames = decodeFrames(stored.frames);
      out.push({ video, analysis, frames, measures: computeMeasurements(frames, video.meta, analysis.phases, { hand: video.playingHand, view: video.cameraView }) });
    }
    return out;
  }).data;

  const a = list?.find((x) => x.video.id === aId) ?? list?.[1] ?? null;
  const b = list?.find((x) => x.video.id === bId) ?? list?.[0] ?? null;
  const comparison = useMemo(
    () => (a && b && a !== b ? compareAnalyses({ measures: a.measures, phases: a.analysis.phases!, view: a.video.cameraView }, { measures: b.measures, phases: b.analysis.phases!, view: b.video.cameraView }) : null),
    [a, b],
  );
  if (!list) return <Screen testID="compare"><AppText muted>Loading…</AppText></Screen>;
  if (list.length < 2) return <Screen testID="compare"><AppText>Analyse at least two videos with usable tracking to compare them.</AppText></Screen>;

  const label = (x: Analysed) => `${new Date(x.video.importedAt).toLocaleDateString()} · ${x.video.cameraView ? CAMERA_VIEW_LABELS[x.video.cameraView] : 'view not set'}`;
  const options = list.map((x) => ({ value: x.video.id, label: label(x) }));
  const colW = (Math.min(width, 720) - space.lg * 2 - space.sm) / 2;
  const aligned = comparison?.alignedFrames[phase];

  return (
    <Screen testID="compare">
      <ChoiceChips label="Swing A" options={options} value={a?.video.id ?? null} onChange={setAId} testIDPrefix="compare-a" />
      <ChoiceChips label="Swing B" options={options} value={b?.video.id ?? null} onChange={setBId} testIDPrefix="compare-b" />
      {a === b ? <AppText>Choose two different swings.</AppText> : null}
      {comparison ? (
        <>
          {comparison.warnings.map((w) => (
            <AppText key={w} variant="caption">⚠︎ {w}</AppText>
          ))}
          <ChoiceChips
            label="Line up at"
            options={PHASES.filter((p) => comparison.alignedFrames[p]).map((p) => ({ value: p, label: PHASE_LABELS[p] }))}
            value={aligned ? phase : null}
            onChange={(p) => p && setPhase(p)}
            testIDPrefix="compare-phase"
          />
          {aligned && a && b ? (
            <Row gap={space.sm} style={{ alignItems: 'flex-start' }}>
              <View style={{ gap: space.xs }}>
                <PoseFrameStill fileUri={a.video.fileUri} frame={a.frames[aligned.a]!} size={a.video.meta} width={colW} testID="compare-frame-a" />
                <AppText variant="caption">A · {a.frames[aligned.a]!.t.toFixed(2)} s</AppText>
              </View>
              <View style={{ gap: space.xs }}>
                <PoseFrameStill fileUri={b.video.fileUri} frame={b.frames[aligned.b]!} size={b.video.meta} width={colW} testID="compare-frame-b" />
                <AppText variant="caption">B · {b.frames[aligned.b]!.t.toFixed(2)} s</AppText>
              </View>
            </Row>
          ) : (
            <AppText variant="caption" muted>This phase was not found in both swings.</AppText>
          )}
          <Card testID="comparison-table">
            <Stack gap={space.sm}>
              <AppText variant="subheading">Differences (B − A)</AppText>
              {comparison.rows.map((r) => {
                const ma = a!.measures.find((m) => m.id === r.id)!;
                const mb = b!.measures.find((m) => m.id === r.id)!;
                return (
                  <Stack key={r.id} gap={2}>
                    <AppText variant="label">{r.label}</AppText>
                    <AppText variant="caption">A {formatMeasurement(ma)} · B {formatMeasurement(mb)}</AppText>
                    <AppText variant="caption" muted>{r.note}</AppText>
                  </Stack>
                );
              })}
            </Stack>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
