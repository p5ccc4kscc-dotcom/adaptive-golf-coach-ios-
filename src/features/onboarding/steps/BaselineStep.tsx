import { useState } from 'react';
import { View } from 'react-native';

import { formatLocalDate } from '@/domain/dates';
import { PlayerProfile, validateBaselineRound } from '@/domain/profile';
import { parseNumberInput } from '@/domain/units';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Button, Card, ChoiceChips, Divider, NotAvailable, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { StepFrame, StepProps } from '../StepFrame';

export function BaselineStep({ profile, ...props }: StepProps & { profile: PlayerProfile }) {
  const { repos, ownerId, invalidate, todayLocal } = useServices();
  const rounds = useQuery((s) => s.repos.baseline.list(s.ownerId)).data ?? [];
  const [lessonFocus, setLessonFocus] = useState(profile.existingLessonFocus.value ?? '');
  const [playedOn, setPlayedOn] = useState('');
  const [holes, setHoles] = useState<'9' | '18' | null>(null);
  const [strokes, setStrokes] = useState('');
  const [putts, setPutts] = useState('');
  const [course, setCourse] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addRound = async () => {
    const s = parseNumberInput(strokes);
    const p = parseNumberInput(putts);
    const e = validateBaselineRound({ playedOn, holes: holes ? Number(holes) : 0, totalStrokes: s, totalPutts: p }, todayLocal());
    if ((s !== null && Number.isNaN(s)) || (p !== null && Number.isNaN(p))) e.totalStrokes = e.totalStrokes ?? 'Enter whole numbers.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await repos.baseline.add(ownerId, {
      playedOn,
      holes: Number(holes) as 9 | 18,
      totalStrokes: s,
      totalPutts: p,
      courseName: course.trim() || null,
      source: 'self_reported',
      notes: null,
    });
    setPlayedOn('');
    setHoles(null);
    setStrokes('');
    setPutts('');
    setCourse('');
    invalidate();
  };

  return (
    <StepFrame
      step="baseline"
      {...props}
      onSave={async () => {
        await repos.profile.setFacts(ownerId, { existingLessonFocus: { value: lessonFocus } });
        return true;
      }}
      intro="Optional. Add past information now or later. Nothing here is filled in automatically."
    >
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Past rounds</AppText>
          {rounds.length === 0 ? <AppText muted>No past rounds entered.</AppText> : null}
          {rounds.map((r) => (
            <View key={r.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <AppText>
                  {formatLocalDate(r.playedOn)} · {r.holes} holes · {r.totalStrokes ?? 'score not entered'} · putts {r.totalPutts ?? 'not recorded'}
                  {r.courseName ? ` · ${r.courseName}` : ''}
                </AppText>
                <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove round from ${r.playedOn}`} onPress={async () => { await repos.baseline.remove(r.id); invalidate(); }} />
              </Row>
              <Divider />
            </View>
          ))}
          <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
            <TextField label="Date played (YYYY-MM-DD)" value={playedOn} onChangeText={setPlayedOn} error={errors.playedOn} style={{ flex: 1 }} testID="round-date" />
            <Button compact variant="secondary" label="Today" onPress={() => setPlayedOn(todayLocal())} />
          </Row>
          <ChoiceChips
            label="Holes"
            options={[
              { value: '9' as const, label: '9 holes' },
              { value: '18' as const, label: '18 holes' },
            ]}
            value={holes}
            onChange={setHoles}
            testIDPrefix="round-holes"
          />
          {errors.holes ? <AppText variant="caption">{errors.holes}</AppText> : null}
          <TextField label="Total score (optional)" value={strokes} onChangeText={setStrokes} keyboardType="number-pad" error={errors.totalStrokes} testID="round-score" />
          <TextField label="Total putts (optional — leave blank if not counted)" value={putts} onChangeText={setPutts} keyboardType="number-pad" error={errors.totalPutts} testID="round-putts" />
          <TextField label="Course (optional)" value={course} onChangeText={setCourse} maxLength={80} />
          <Button label="Add round" variant="secondary" onPress={addRound} testID="add-round" />
          <AppText variant="caption" muted>
            Hole-by-hole scorecards arrive in M3. These totals are stored as self-reported and never used to calculate an official handicap.
          </AppText>
        </Stack>
      </Card>
      <AppText variant="caption" muted>
        Club distances: open a club in My Clubs and use “Add a distance record”, choosing estimated or measured.
      </AppText>
      <TextField label="Current lesson focus or coach advice (optional)" value={lessonFocus} onChangeText={setLessonFocus} multiline maxLength={1000} />
      <NotAvailable title="Swing video import" detail="Importing and analysing swing videos arrives in M1 and needs the iPhone app build." milestone="M1" />
    </StepFrame>
  );
}
