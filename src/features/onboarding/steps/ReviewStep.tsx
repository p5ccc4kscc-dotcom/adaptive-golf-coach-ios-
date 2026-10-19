import { useRouter } from 'expo-router';

import { UnitPreferences } from '@/data/repositories/profileRepository';
import { bagCountLabel } from '@/domain/bag';
import { roundPuttsText } from '@/domain/baseline';
import { clubDisplayName } from '@/domain/clubs';
import { formatLocalDate } from '@/domain/dates';
import { complete } from '@/domain/onboarding';
import { PlayerProfile } from '@/domain/profile';
import { useQuery, useServices } from '@/services/AppServices';
import { AppText, Button, Card, Disclosure, NotAvailable, Row, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { ProfileSummary } from '../../profile/ProfileSummary';
import { StarterPlanCard } from '../../today/StarterPlanCard';
import { StepFrame, StepProps } from '../StepFrame';

export function ReviewStep({ profile, units, ...props }: StepProps & { profile: PlayerProfile; units: UnitPreferences }) {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [clubs, members, goals, rounds, outcomes, notes] = await Promise.all([
      s.repos.clubs.list(s.ownerId),
      s.repos.bags.members(bag.id),
      s.repos.goals.list(s.ownerId),
      s.repos.baseline.list(s.ownerId),
      s.repos.rangeOutcomes.list(s.ownerId),
      s.repos.coachNotes.list(s.ownerId),
    ]);
    return { bag, clubs, members, goals, rounds, outcomes, notes };
  }).data;

  const editStep = (step: string) => router.push({ pathname: '/onboarding/[step]', params: { step, return: 'review' } });

  const finish = async () => {
    await repos.onboarding.save(complete(await repos.onboarding.get(ownerId), new Date().toISOString()));
    invalidate();
    router.replace('/today');
  };

  return (
    <StepFrame
      step="review"
      {...props}
      onSave={async () => true}
      intro="Exactly what you entered. Blanks stay unknown until you add them."
      footer={
        <Stack gap={space.sm}>
          <Button label="Finish setup" onPress={finish} testID="finish-setup" />
          <Button label="Back" variant="secondary" onPress={() => router.replace('/onboarding/baseline')} testID="back" />
        </Stack>
      }
    >
      <ProfileSummary profile={profile} units={units} onEdit={editStep} />
      <Card testID="summary-goals">
        <Stack gap={space.xs}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="subheading">Goals</AppText>
            <Button compact variant="ghost" label="Edit" accessibilityLabel="Edit goals" onPress={() => editStep('goals')} />
          </Row>
          {data?.goals.length ? data.goals.map((g, i) => <AppText key={g.id}>{i + 1}. {g.text}{g.measurableDefinition ? ` — ${g.measurableDefinition}` : ''}</AppText>) : <AppText muted>No goals entered.</AppText>}
        </Stack>
      </Card>
      <Card testID="summary-clubs">
        <Stack gap={space.xs}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="subheading">Clubs</AppText>
            <Button compact variant="ghost" label="Edit" accessibilityLabel="Edit clubs" onPress={() => editStep('clubs')} />
          </Row>
          <AppText>{data ? `${data.clubs.length} owned · ${bagCountLabel(data.bag.kind, data.members.length)}` : ''}</AppText>
          {data?.members.length ? (
            <Disclosure label={`Show the ${data.members.length} clubs in ${data.bag.name}`} openLabel="Hide clubs" testID="review-bag-clubs">
              <AppText variant="caption">{data.members.map((c) => `${clubDisplayName(c)}${c.brand ? ` (${c.brand})` : ''}`).join(', ')}</AppText>
            </Disclosure>
          ) : null}
          {data && data.clubs.length === 0 ? <AppText variant="caption" muted>No clubs added. Club-specific practice will be suggested once you add some.</AppText> : null}
        </Stack>
      </Card>
      <Card testID="summary-baseline">
        <Stack gap={space.xs}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="subheading">Baseline</AppText>
            <Button compact variant="ghost" label="Edit" accessibilityLabel="Edit baseline" onPress={() => editStep('baseline')} />
          </Row>
          {data?.rounds.length ? (
            data.rounds.map((r) => (
              <AppText key={r.id}>
                {formatLocalDate(r.playedOn)} · {r.holes} holes · score {r.totalStrokes ?? 'not entered'} · {roundPuttsText(r)}
              </AppText>
            ))
          ) : (
            <AppText muted>No past rounds entered.</AppText>
          )}
          <AppText>
            {data?.outcomes.length ? `${data.outcomes.length} recent range ${data.outcomes.length === 1 ? 'session' : 'sessions'} entered.` : 'No range sessions entered.'}
          </AppText>
          <AppText>{data?.notes.length ? `${data.notes.length} coach ${data.notes.length === 1 ? 'note' : 'notes'} (self-reported).` : 'No coach notes.'}</AppText>
        </Stack>
      </Card>
      <StarterPlanCard profile={profile} bag={data?.members ?? []} />
      <NotAvailable title="Logging this session" detail="Recording drill results and skill progress comes with the coaching engine." milestone="M2" />
    </StepFrame>
  );
}
