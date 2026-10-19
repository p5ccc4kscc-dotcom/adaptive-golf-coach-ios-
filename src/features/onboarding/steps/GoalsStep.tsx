import { useState } from 'react';
import { View } from 'react-native';

import { CHALLENGES, Challenge, LABELS, PlayerGoal, PlayerProfile, ballFlightDirectionHint, validateGoalText } from '@/domain/profile';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Button, Card, MultiChips, Row, Stack, TextField } from '@/ui/components';
import { space } from '@/ui/theme';

import { StepFrame, StepProps } from '../StepFrame';

export function GoalsStep({ profile, ...props }: StepProps & { profile: PlayerProfile }) {
  const { repos, ownerId, invalidate } = useServices();
  const hand = profile.playingHand.value;
  const [challenges, setChallenges] = useState<Challenge[]>(profile.challenges.value ?? []);
  const [other, setOther] = useState(profile.challengesOther.value ?? '');
  const goals = useQuery((s) => s.repos.goals.list(s.ownerId)).data ?? [];
  const [goalText, setGoalText] = useState('');
  const [goalMeasure, setGoalMeasure] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);

  const handNote =
    hand === 'right' || hand === 'left'
      ? `Directions below are shown for a ${hand}-handed golfer, as you told us.`
      : 'You haven’t told us which hand you play, so directions are shown for both.';

  const save = async () => {
    await repos.profile.setFacts(ownerId, { challenges: { value: challenges }, challengesOther: { value: other } });
    return true;
  };

  const addGoal = async () => {
    const err = validateGoalText(goalText);
    setGoalError(err);
    if (err) return;
    await repos.goals.add(ownerId, goalText, goalMeasure);
    setGoalText('');
    setGoalMeasure('');
    invalidate();
  };

  return (
    <StepFrame step="goals" {...props} onSave={save} intro="What gets in your way, and what would you like to achieve? Choose as many as apply, or none.">
      <AppText variant="caption" muted>
        {handNote}
      </AppText>
      <MultiChips
        label="Known challenges"
        options={CHALLENGES.map((c) => ({ value: c, label: LABELS.challenges[c], hint: ballFlightDirectionHint(hand, c) }))}
        value={challenges}
        onChange={setChallenges}
        testIDPrefix="challenge"
      />
      <TextField label="Other (optional)" value={other} onChangeText={setOther} maxLength={200} />

      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Your goals (optional)</AppText>
          <AppText variant="caption" muted>
            In priority order. A measurable definition helps later, e.g. “keep 12 of 20 tee shots playable” or “no more than two three-putts per round”.
          </AppText>
          {goals.length === 0 ? <AppText muted>No goals added.</AppText> : null}
          {goals.map((g: PlayerGoal, i: number) => (
            <View key={g.id} style={{ gap: space.xs }}>
              <AppText variant="label">
                {i + 1}. {g.text}
              </AppText>
              {g.measurableDefinition ? (
                <AppText variant="caption" muted>
                  Measured by: {g.measurableDefinition}
                </AppText>
              ) : null}
              <Row gap={space.sm} wrap>
                <Button compact variant="ghost" label="Move up" accessibilityLabel={`Move goal ${g.text} up`} disabled={i === 0} onPress={async () => { await repos.goals.move(ownerId, g.id, -1); invalidate(); }} />
                <Button compact variant="ghost" label="Move down" accessibilityLabel={`Move goal ${g.text} down`} disabled={i === goals.length - 1} onPress={async () => { await repos.goals.move(ownerId, g.id, 1); invalidate(); }} />
                <Button compact variant="ghost" label="Remove" accessibilityLabel={`Remove goal ${g.text}`} onPress={async () => { await repos.goals.archive(g.id); invalidate(); }} />
              </Row>
            </View>
          ))}
          <TextField label="New goal" value={goalText} onChangeText={setGoalText} error={goalError} maxLength={200} testID="goal-text" />
          <TextField label="How will you measure it? (optional)" value={goalMeasure} onChangeText={setGoalMeasure} maxLength={200} testID="goal-measure" />
          <Button label="Add goal" variant="secondary" onPress={addGoal} testID="add-goal" />
        </Stack>
      </Card>
    </StepFrame>
  );
}
