import { useRouter } from 'expo-router';

import { bagCountLabel } from '@/domain/bag';
import { featuresByStatus } from '@/domain/features';
import { ONBOARDING_STEPS, stepIndex } from '@/domain/onboarding';
import { useQuery } from '@/services/AppServices';
import { BrandMark } from '@/ui/Brand';
import { AppText, Button, Card, Disclosure, Loading, ProgressBar, Row, Screen, Stack, StatTile } from '@/ui/components';
import { FeatureStatusList } from '@/ui/FeatureStatusList';
import { space } from '@/ui/theme';

import { StarterPlanCard } from './StarterPlanCard';

function todayLabel(): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

export function TodayScreen() {
  const router = useRouter();
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [profile, progress, members, goals, owned] = await Promise.all([
      s.repos.profile.getProfile(s.ownerId),
      s.repos.onboarding.get(s.ownerId),
      s.repos.bags.members(bag.id),
      s.repos.goals.list(s.ownerId),
      s.repos.clubs.list(s.ownerId),
    ]);
    return { profile, progress, bag, members, goals, owned };
  }).data;
  if (!data) return <Loading />;
  const { profile, progress, bag, members, goals, owned } = data;
  const name = profile.displayName.value;
  const explored = progress.status === 'explored_empty';
  const step = stepIndex(progress.currentStep) + 1;

  return (
    <Screen testID="today" tab title={name ? `Hello, ${name}` : 'Today'} subtitle={todayLabel()} headerRight={<BrandMark size={36} />}>
      {progress.status !== 'completed' ? (
        <Card tone="info" testID="finish-setup-card">
          <Stack gap={space.sm}>
            <AppText variant="subheading">{explored ? 'Set up when you’re ready' : `Finish setting up · step ${step} of ${ONBOARDING_STEPS.length}`}</AppText>
            {explored ? null : <ProgressBar value={step} max={ONBOARDING_STEPS.length} label={`Setup: step ${step} of ${ONBOARDING_STEPS.length}`} />}
            <AppText variant="caption">A few minutes; every question is optional. Suggestions use only what you tell BadGolfer.</AppText>
            <Button
              compact
              label={explored ? 'Start setup' : 'Continue setup'}
              variant="secondary"
              onPress={() => router.push(`/onboarding/${explored ? 'welcome' : progress.currentStep}`)}
              testID="continue-setup"
            />
          </Stack>
        </Card>
      ) : null}

      <StarterPlanCard profile={profile} bag={members} />

      <Card testID="today-bag">
        <Stack gap={space.sm}>
          <Row style={{ justifyContent: 'space-between' }}>
            <AppText variant="subheading">Your bag</AppText>
            <Button
              compact
              variant="ghost"
              label={owned.length === 0 ? 'Add a club' : 'Build My Bag'}
              onPress={() => router.push(owned.length === 0 ? '/clubs/catalogue' : '/bag')}
              testID="today-bag-action"
            />
          </Row>
          <Row gap={space.sm}>
            <StatTile
              value={bagCountLabel(bag.kind, members.length).replace(' in bag', '')}
              label={`in ${bag.name}`}
              accessibilityLabel={`${bag.name}: ${bagCountLabel(bag.kind, members.length)}. Open Build My Bag`}
              onPress={() => router.push('/bag')}
              testID="today-bag-count"
            />
            <StatTile value={String(owned.length)} label={owned.length === 1 ? 'club owned' : 'clubs owned'} accessibilityLabel={`${owned.length} owned. Open My Clubs`} onPress={() => router.push('/clubs')} testID="today-owned-count" />
          </Row>
        </Stack>
      </Card>

      {goals.length > 0 ? (
        <Card testID="today-goals">
          <Stack gap={space.xs}>
            <AppText variant="subheading">Your goals</AppText>
            {goals.slice(0, 3).map((g, i) => (
              <AppText key={g.id} numberOfLines={2}>
                {i + 1}. {g.text}
              </AppText>
            ))}
            {goals.length > 3 ? (
              <Button compact variant="ghost" label={`See all ${goals.length} goals`} onPress={() => router.push('/profile/goals')} />
            ) : null}
          </Stack>
        </Card>
      ) : null}

      <Card testID="today-coming-next">
        <Stack gap={space.xs}>
          <AppText variant="subheading">Coming next</AppText>
          <AppText variant="caption" muted>
            Daily focus, drills and refresher checks need logged practice and the skills engine (M2). Until then BadGolfer never guesses a fault.
          </AppText>
          <Disclosure label="What works today, and what is planned" openLabel="Hide feature status" testID="today-feature-status">
            <FeatureStatusList features={[...featuresByStatus('available'), ...featuresByStatus('experimental'), ...featuresByStatus('planned')]} />
          </Disclosure>
        </Stack>
      </Card>
    </Screen>
  );
}
