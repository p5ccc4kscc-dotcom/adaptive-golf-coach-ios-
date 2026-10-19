import { useEffect, useRef, useState } from 'react';
import { Image, LayoutChangeEvent, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { JOINTS, JOINT_INDEX, SKELETON } from '@/domain/pose/joints';
import { PHASES, PHASE_LABELS, PhaseResult } from '@/domain/pose/phases';
import { PoseFrame } from '@/domain/pose/types';
import { frameImage } from '@/services/swingAnalysis';
import { AppText, Button, ChoiceChips, Row, Stack } from '@/ui/components';
import { radius, space, useTheme } from '@/ui/theme';

/**
 * Shows the exact analysed frame (extracted from the video at its timestamp)
 * with the landmarks Vision detected in THAT frame drawn on top. While a new
 * frame image loads, the overlay keeps matching the image on screen — it is
 * never drawn over a different frame.
 */
export function PoseFrameViewer({
  fileUri,
  frames,
  size,
  phases,
  index,
  onIndexChange,
  maxHeightRatio = 0.55,
  testID,
}: {
  fileUri: string;
  frames: readonly PoseFrame[];
  size: { displayWidth: number; displayHeight: number };
  phases: PhaseResult | null;
  index: number;
  onIndexChange: (i: number) => void;
  maxHeightRatio?: number;
  testID?: string;
}) {
  const t = useTheme();
  const { height: screenH } = useWindowDimensions();
  const [boxW, setBoxW] = useState(0);
  const [shown, setShown] = useState<{ index: number; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<number, string>());

  useEffect(() => {
    const frame = frames[index];
    if (!frame) return;
    let cancelled = false;
    const cached = cache.current.get(index);
    if (cached) {
      setShown({ index, uri: cached });
      return;
    }
    frameImage(fileUri, frame.t)
      .then((img) => {
        cache.current.set(index, img.uri);
        if (!cancelled) {
          setShown({ index, uri: img.uri });
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [fileUri, frames, index]);

  const aspect = size.displayWidth / size.displayHeight;
  const maxH = screenH * maxHeightRatio;
  const h = boxW > 0 ? Math.min(boxW / aspect, maxH) : 0;
  const w = h * aspect;
  const shownFrame = shown ? frames[shown.index] : undefined;

  return (
    <Stack gap={space.sm} testID={testID}>
      <View onLayout={(e: LayoutChangeEvent) => setBoxW(e.nativeEvent.layout.width)} style={{ width: '100%', alignItems: 'center' }}>
        <View style={{ width: w, height: h, backgroundColor: '#000', borderRadius: radius.sm, overflow: 'hidden' }} accessible accessibilityLabel={shownFrame ? `Frame at ${shownFrame.t.toFixed(3)} seconds with detected joints` : 'Loading frame'}>
          {shown ? <Image source={{ uri: shown.uri }} style={{ width: w, height: h }} resizeMode="stretch" /> : null}
          {shownFrame ? <Overlay frame={shownFrame} w={w} h={h} /> : null}
        </View>
      </View>
      <AppText variant="caption" muted>
        {shownFrame
          ? `Frame ${shown!.index + 1} of ${frames.length} · ${shownFrame.t.toFixed(3)} s · ${shownFrame.bodies === 0 ? 'no person detected' : shownFrame.bodies === 1 ? '1 person' : `${shownFrame.bodies} people (largest shown)`}${shown!.index !== index ? ' · loading…' : ''}`
          : error ?? 'Loading frame…'}
      </AppText>
      <Scrubber count={frames.length} index={index} onChange={onIndexChange} />
      <Row gap={space.sm}>
        <Button compact variant="secondary" label="◀ Frame" accessibilityLabel="Previous frame" disabled={index <= 0} onPress={() => onIndexChange(index - 1)} style={{ flex: 1 }} testID="frame-prev" />
        <Button compact variant="secondary" label="Frame ▶" accessibilityLabel="Next frame" disabled={index >= frames.length - 1} onPress={() => onIndexChange(index + 1)} style={{ flex: 1 }} testID="frame-next" />
      </Row>
      {phases && Object.keys(phases.candidates).length > 0 ? (
        <ChoiceChips
          label="Jump to a phase candidate"
          options={PHASES.filter((p) => phases.candidates[p]).map((p) => ({ value: p, label: `${PHASE_LABELS[p]} · ${phases.candidates[p]!.t.toFixed(2)} s` }))}
          value={PHASES.find((p) => phases.candidates[p]?.frame === index) ?? null}
          onChange={(p) => p && onIndexChange(phases.candidates[p]!.frame)}
          testIDPrefix="jump"
        />
      ) : null}
      <AppText variant="caption" muted>
        Dots: joints Apple Vision detected in this frame (solid = more confident). Missing joints are left out, never guessed.
      </AppText>
      <View style={{ height: 1, backgroundColor: t.border }} />
    </Stack>
  );
}

function Overlay({ frame, w, h }: { frame: PoseFrame; w: number; h: number }) {
  const at = (j: (typeof JOINTS)[number]) => frame.joints[JOINT_INDEX[j]] ?? null;
  return (
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      {SKELETON.map(([a, b]) => {
        const pa = at(a);
        const pb = at(b);
        if (!pa || !pb) return null;
        return <Line key={`${a}-${b}`} x1={pa.x * w} y1={pa.y * h} x2={pb.x * w} y2={pb.y * h} stroke="#C6F15A" strokeWidth={2} strokeOpacity={0.85} />;
      })}
      {JOINTS.map((j) => {
        const p = at(j);
        if (!p) return null;
        return <Circle key={j} cx={p.x * w} cy={p.y * h} r={4} fill="#FFFFFF" fillOpacity={0.4 + 0.6 * p.c} stroke="#0E4A33" strokeWidth={1.5} />;
      })}
    </Svg>
  );
}

/** A 44 pt-tall drag bar over the analysed frames. */
function Scrubber({ count, index, onChange }: { count: number; index: number; onChange: (i: number) => void }) {
  const t = useTheme();
  const width = useRef(1);
  const pick = (x: number) => onChange(Math.max(0, Math.min(count - 1, Math.round((x / width.current) * (count - 1)))));
  const pct = count > 1 ? index / (count - 1) : 0;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Frame position"
      accessibilityValue={{ min: 1, max: count, now: index + 1 }}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(count - 1, index + (e.nativeEvent.actionName === 'increment' ? 1 : -1))))}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
      style={{ height: 44, justifyContent: 'center' }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
      onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      testID="frame-scrubber"
    >
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceAlt }} pointerEvents="none">
        <View style={{ width: `${pct * 100}%`, height: 6, borderRadius: 3, backgroundColor: t.primary }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${pct * 100}%`, marginLeft: -11, width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, borderWidth: 2, borderColor: t.surface }} />
    </View>
  );
}

/** One analysed frame with its landmarks, without controls (used side by side in comparisons). */
export function PoseFrameStill({ fileUri, frame, size, width, testID }: { fileUri: string; frame: PoseFrame; size: { displayWidth: number; displayHeight: number }; width: number; testID?: string }) {
  const [shown, setShown] = useState<{ t: number; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    frameImage(fileUri, frame.t, 720)
      .then((img) => !cancelled && setShown({ t: frame.t, uri: img.uri }))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      cancelled = true;
    };
  }, [fileUri, frame.t]);
  const h = width / (size.displayWidth / size.displayHeight);
  return (
    <View testID={testID} style={{ width, height: h, backgroundColor: '#000', borderRadius: radius.sm, overflow: 'hidden' }}>
      {shown ? <Image source={{ uri: shown.uri }} style={{ width, height: h }} resizeMode="stretch" /> : null}
      {shown && shown.t === frame.t ? <Overlay frame={frame} w={width} h={h} /> : null}
      {error ? <AppText variant="caption" style={{ color: '#fff', padding: 4 }}>{error}</AppText> : null}
    </View>
  );
}
