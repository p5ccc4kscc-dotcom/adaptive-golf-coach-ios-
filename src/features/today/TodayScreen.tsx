import { useRouter } from 'expo-router';

import { bagCountLabel } from '@/domain/bag';
import { useQuery } from '@/services/AppServices';
import { AppText, Button, Card, Loading, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { StarterPlanCard } from './StarterPlanCard';

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

  return (
    <Screen testID="today">
      <AppText variant="title">{name ? `Hello, ${name}` : 'Today'}</AppText>
      {progress.status !== 'completed' ? (
        <Card tone="info" testID="finish-setup-card">
          <Stack gap={space.sm}>
            <AppText variant="subheading">Set up when you’re ready</AppText>
            <AppText>Suggestions are based only on what you tell the app and what you record. Setup takes a few minutes and every question is optional.</AppText>
            <Button label={progress.status === 'explored_empty' ? 'Start setup' : 'Continue setup'} variant="secondary" onPress={() => router.push(`/onboarding/${progress.status === 'explored_empty' ? 'welcome' : progress.currentStep}`)} testID="continue-setup" />
          </Stack>
        </Card>
      ) : null}

      <StarterPlanCard profile={profile} bag={members} />

      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">Your bag</AppText>
          <AppText testID="today-bag-count">
            {bag.name}: {bagCountLabel(bag.kind, members.length)} · {owned.length} owned
          </AppText>
          <Button label={owned.length === 0 ? 'Add your first club' : 'Build My Bag'} variant="secondary" onPress={() => router.push(owned.length === 0 ? '/clubs/catalogue' : '/bag')} />
        </Stack>
      </Card>

      {goals.length > 0 ? (
        <Card>
          <Stack gap={space.xs}>
            <AppText variant="subheading">Your goals</AppText>
            {goals.map((g, i) => (
              <AppText key={g.id}>
                {i + 1}. {g.text}
              </AppText>
            ))}
          </Stack>
        </Card>
      ) : null}

      <NotAvailable
        title="Personalised daily focus, drills and refresher flags"
        detail="These need logged practice evidence and the skills engine (M2). Until then the app shows only the diagnostic starter above and never guesses a fault."
        milestone="M2"
      />
    </Screen>
  );
}
