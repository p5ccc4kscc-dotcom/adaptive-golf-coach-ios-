import { useState } from 'react';
import { View } from 'react-native';

import { BaselineRangeOutcome, ClubChoice, RANGE_CONTEXT_LABELS, RangeContext, roundPuttsText, summarisePutts, validateHolePutts, validateRangeOutcome } from '@/domain/baseline';
import { ClubInstance, clubDisplayName } from '@/domain/clubs';
import { formatLocalDate } from '@/domain/dates';
import { BaselineRound, PlayerProfile, validateBaselineRound } from '@/domain/profile';
import { parseNumberInput } from '@/domain/units';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Button, Card, ChoiceChips, Divider, NotAvailable, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { ClubPicker } from '../../clubs/ClubPicker';
import { StepFrame, StepProps } from '../StepFrame';

type PuttsMode = 'total' | 'per_hole' | 'not_counted';

export function BaselineStep({ profile, ...props }: StepProps & { profile: PlayerProfile }) {
  const { repos, ownerId } = useServices();
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [rounds, outcomes, members, owned, allClubs] = await Promise.all([
      s.repos.baseline.list(s.ownerId),
      s.repos.rangeOutcomes.list(s.ownerId),
      s.repos.bags.members(bag.id),
      s.repos.clubs.list(s.ownerId),
      s.repos.clubs.list(s.ownerId, { includeArchived: true }),
    ]);
    return { rounds, outcomes, members, owned, allClubs };
  }).data;
  const [lessonFocus, setLessonFocus] = useState(profile.existingLessonFocus.value ?? '');

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
      <PastRounds rounds={data?.rounds ?? []} />
      <RangeOutcomes
        outcomes={data?.outcomes ?? []}
        bag={data?.members ?? []}
        owned={data?.owned ?? []}
        clubName={(id) => {
          const c = data?.allClubs.find((x) => x.id === id);
          return c ? clubDisplayName(c) : 'Club removed';
        }}
      />
      <AppText variant="caption" muted>
        Club distances: open a club in My Clubs and use “Add a distance record”, choosing estimated or measured.
      </AppText>
      <TextField label="Current lesson focus or coach advice (optional)" value={lessonFocus} onChangeText={setLessonFocus} multiline maxLength={1000} />
      <NotAvailable title="Swing video import" detail="Importing and analysing swing videos arrives in M1 and needs the iPhone app build." milestone="M1" />
    </StepFrame>
  );

}

function PastRounds({ rounds }: { rounds: BaselineRound[] }) {
  const { repos, ownerId, invalidate, todayLocal } = useServices();
  const [playedOn, setPlayedOn] = useState('');
  const [holes, setHoles] = useState<'9' | '18' | null>(null);
  const [strokes, setStrokes] = useState('');
  const [puttsMode, setPuttsMode] = useState<PuttsMode>('not_counted');
  const [putts, setPutts] = useState('');
  const [holePutts, setHolePutts] = useState<string[]>([]);
  const [course, setCourse] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const holeCount = holes ? Number(holes) : 0;

  const addRound = async () => {
    const s = parseNumberInput(strokes);
    const hp = puttsMode === 'per_hole' ? Array.from({ length: holeCount }, (_, i) => parseNumberInput(holePutts[i] ?? '')) : null;
    const p = puttsMode === 'total' ? parseNumberInput(putts) : hp ? summarisePutts(hp).total : null;
    const e = validateBaselineRound({ playedOn, holes: holeCount, totalStrokes: s, totalPutts: p }, todayLocal());
    if (s !== null && Number.isNaN(s)) e.totalStrokes = 'Enter a whole number.';
    if (puttsMode === 'total' && p !== null && Number.isNaN(p)) e.totalPutts = 'Enter a whole number.';
    if (hp && holeCount) {
      const he = validateHolePutts(hp, holeCount as 9 | 18);
      if (he) e.holePutts = he;
    }
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    await repos.baseline.add(ownerId, {
      playedOn,
      holes: holeCount as 9 | 18,
      totalStrokes: s,
      totalPutts: puttsMode === 'total' ? p : null,
      holePutts: hp,
      courseName: course.trim() || null,
      source: 'self_reported',
      notes: null,
    });
    setPlayedOn('');
    setHoles(null);
    setStrokes('');
    setPutts('');
    setHolePutts([]);
    setPuttsMode('not_counted');
    setCourse('');
    invalidate();
  };

  return (
    <Card testID="past-rounds">
      <Stack gap={space.md}>
        <AppText variant="subheading">Past rounds</AppText>
        {rounds.length === 0 ? <AppText muted>No past rounds entered.</AppText> : null}
        {rounds.map((r) => (
          <View key={r.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText style={{ flex: 1 }}>
                {formatLocalDate(r.playedOn)} · {r.holes} holes · {r.totalStrokes ?? 'score not entered'} · {roundPuttsText(r)}
                {r.courseName ? ` · ${r.courseName}` : ''}
              </AppText>
              <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove round from ${r.playedOn}`} onPress={async () => { await repos.baseline.remove(r.id); invalidate(); }} />
            </Row>
            <Divider />
          </View>
        ))}
        <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
          <TextField label="Date played (YYYY-MM-DD)" value={playedOn} onChangeText={setPlayedOn} error={errors.playedOn} style={{ flex: 1 }} testID="round-date" />
          <Button compact variant="secondary" label="Today" accessibilityLabel="Set round date to today" onPress={() => setPlayedOn(todayLocal())} />
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
        <ChoiceChips
          label="Putts"
          options={[
            { value: 'not_counted' as const, label: 'Not counted' },
            { value: 'total' as const, label: 'Total only' },
            { value: 'per_hole' as const, label: 'Hole by hole' },
          ]}
          value={puttsMode}
          onChange={(v) => v && setPuttsMode(v)}
          testIDPrefix="putts-mode"
        />
        {puttsMode === 'total' ? (
          <TextField label="Total putts" value={putts} onChangeText={setPutts} keyboardType="number-pad" error={errors.totalPutts} testID="round-putts" />
        ) : null}
        {puttsMode === 'per_hole' ? (
          holeCount === 0 ? (
            <AppText variant="caption" muted>
              Choose 9 or 18 holes first.
            </AppText>
          ) : (
            <Stack gap={space.xs}>
              <AppText variant="caption" muted>
                Leave a hole blank if you didn’t count its putts. Blank holes are shown as not recorded, never as zero.
              </AppText>
              <Row wrap gap={space.sm}>
                {Array.from({ length: holeCount }, (_, i) => (
                  <TextField
                    key={i}
                    label={`H${i + 1}`}
                    accessibilityLabel={`Putts on hole ${i + 1}`}
                    value={holePutts[i] ?? ''}
                    onChangeText={(v) => setHolePutts((prev) => {
                      const next = [...prev];
                      next[i] = v;
                      return next;
                    })}
                    keyboardType="number-pad"
                    style={{ width: 64 }}
                    testID={`hole-putts-${i + 1}`}
                  />
                ))}
              </Row>
              {errors.holePutts || errors.totalPutts ? <AppText variant="caption">{errors.holePutts ?? errors.totalPutts}</AppText> : null}
            </Stack>
          )
        ) : null}
        <TextField label="Course (optional)" value={course} onChangeText={setCourse} maxLength={80} />
        <Button label="Add round" variant="secondary" onPress={addRound} testID="add-round" />
        <AppText variant="caption" muted>
          Full scorecards arrive in M3. These entries are self-reported and never used to calculate an official handicap.
        </AppText>
      </Stack>
    </Card>
  );
}

function RangeOutcomes({
  outcomes,
  bag,
  owned,
  clubName,
}: {
  outcomes: BaselineRangeOutcome[];
  bag: ClubInstance[];
  owned: ClubInstance[];
  clubName: (id: string) => string;
}) {
  const { repos, ownerId, invalidate, todayLocal } = useServices();
  const [observedOn, setObservedOn] = useState('');
  const [club, setClub] = useState<ClubChoice | null>(null);
  const [context, setContext] = useState<RangeContext | null>(null);
  const [shots, setShots] = useState('');
  const [successes, setSuccesses] = useState('');
  const [definition, setDefinition] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = async () => {
    const sh = parseNumberInput(shots);
    const su = parseNumberInput(successes);
    const e = validateRangeOutcome({ observedOn, club, shots: sh, successes: su, successDefinition: definition }, todayLocal());
    if (!context) e.context = 'Choose where you practised.';
    setErrors(e);
    if (Object.keys(e).length > 0 || !club || !context || sh === null) return;
    await repos.rangeOutcomes.add(ownerId, {
      observedOn,
      club,
      context,
      shots: sh,
      successes: su,
      successDefinition: su === null ? null : definition.trim(),
      notes: null,
      source: 'self_reported',
    });
    setObservedOn('');
    setClub(null);
    setContext(null);
    setShots('');
    setSuccesses('');
    setDefinition('');
    invalidate();
  };

  return (
    <Card testID="range-outcomes">
      <Stack gap={space.md}>
        <AppText variant="subheading">Recent range sessions (optional)</AppText>
        <AppText variant="caption" muted>
          What you actually hit, in your own words. This is a starting record, not an assessment.
        </AppText>
        {outcomes.length === 0 ? <AppText muted>No range sessions entered.</AppText> : null}
        {outcomes.map((o) => (
          <View key={o.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <AppText style={{ flex: 1 }}>
                {formatLocalDate(o.observedOn)} · {o.club.clubInstanceId ? clubName(o.club.clubInstanceId) : 'Club not entered'} · {RANGE_CONTEXT_LABELS[o.context]} · {o.shots} shots
                {o.successes !== null ? ` · ${o.successes}/${o.shots} ${o.successDefinition ?? ''}` : ' · successes not counted'}
              </AppText>
              <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove range session from ${o.observedOn}`} onPress={async () => { await repos.rangeOutcomes.remove(o.id); invalidate(); }} />
            </Row>
            <Divider />
          </View>
        ))}
        <Row gap={space.sm} style={{ alignItems: 'flex-end' }}>
          <TextField label="Date (YYYY-MM-DD)" value={observedOn} onChangeText={setObservedOn} error={errors.observedOn} style={{ flex: 1 }} testID="range-date" />
          <Button compact variant="secondary" label="Today" accessibilityLabel="Set range session date to today" onPress={() => setObservedOn(todayLocal())} testID="range-today" />
        </Row>
        <ClubPicker label="Club" bag={bag} owned={owned} value={club} onChange={setClub} error={errors.club} testIDPrefix="range-club" />
        <ChoiceChips
          label="Where?"
          options={(Object.keys(RANGE_CONTEXT_LABELS) as RangeContext[]).map((c) => ({ value: c, label: RANGE_CONTEXT_LABELS[c] }))}
          value={context}
          onChange={setContext}
          testIDPrefix="range-context"
        />
        {errors.context ? <AppText variant="caption">{errors.context}</AppText> : null}
        <TextField label="Shots hit" value={shots} onChangeText={setShots} keyboardType="number-pad" error={errors.shots} testID="range-shots" />
        <TextField label="Successful shots (optional)" value={successes} onChangeText={setSuccesses} keyboardType="number-pad" error={errors.successes} testID="range-successes" />
        {parseNumberInput(successes) !== null ? (
          <TextField label="What counted as a success?" value={definition} onChangeText={setDefinition} placeholder="e.g. finished playable, started on line" error={errors.successDefinition} maxLength={120} testID="range-definition" />
        ) : null}
        <Button label="Add range session" variant="secondary" onPress={add} testID="add-range" />
      </Stack>
    </Card>
  );
}
