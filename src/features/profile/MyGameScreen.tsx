import { useRouter } from 'expo-router';

import { bagCountLabel } from '@/domain/bag';
import { OnboardingStep } from '@/domain/onboarding';
import { useQuery, useUnits } from '@/services/AppServices';
import { AppText, ListRow, Loading, NotAvailable, Screen, SectionHeader, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { ProfileSummary } from './ProfileSummary';

export function MyGameScreen() {
  const router = useRouter();
  const units = useUnits();
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [profile, clubs, members, presets, goals] = await Promise.all([
      s.repos.profile.getProfile(s.ownerId),
      s.repos.clubs.list(s.ownerId),
      s.repos.bags.memberIds(bag.id),
      s.repos.bags.list(s.ownerId),
      s.repos.goals.list(s.ownerId),
    ]);
    return { profile, clubs, bag, members, presets, goals };
  }).data;
  if (!data || !units) return <Loading />;
  const edit = (step: OnboardingStep) => router.push(`/profile/${step}`);

  return (
    <Screen testID="my-game" tab title="My Game" subtitle="Equipment, profile and progress">
      <SectionHeader title="Equipment" />
      <Stack gap={space.sm}>
        <ListRow title="My Clubs" subtitle={`${data.clubs.length} owned`} onPress={() => router.push('/clubs')} testID="nav-my-clubs" />
        <ListRow
          title="Build My Bag"
          subtitle={`${data.bag.name}: ${bagCountLabel(data.bag.kind, data.members.length)} · ${data.presets.length} saved ${data.presets.length === 1 ? 'bag' : 'bags'}`}
          onPress={() => router.push('/bag')}
          testID="nav-bag"
        />
        <ListRow title="Club Face Gallery" subtitle="Add any type of club" onPress={() => router.push('/clubs/catalogue')} />
      </Stack>

      <SectionHeader title="Player profile" />
      <AppText variant="caption" muted>
        Edit any answer at any time. Changes are recorded with a date; earlier answers are kept in history, not silently overwritten.
      </AppText>
      <ProfileSummary profile={data.profile} units={units} onEdit={edit} />
      <Stack gap={space.sm}>
        <ListRow title="Goals" subtitle={data.goals.length ? `${data.goals.length} active` : 'None entered'} onPress={() => edit('goals')} />
        <ListRow title="Clubs step" subtitle="Club gallery and bag" onPress={() => edit('clubs')} />
        <ListRow title="Baseline" subtitle="Past rounds and lesson focus" onPress={() => edit('baseline')} />
      </Stack>

      <SectionHeader title="Progress" />
      <NotAvailable title="Score, putting and gapping trends; skills map" detail="Charts appear once rounds and practice can be logged (M3) and skills assessed (M2). They will always show sample sizes." milestone="M2–M3" />

      <SectionHeader title="Settings" />
      <ListRow title="Units, data & privacy" subtitle="Units, export, delete all my data" onPress={() => router.push('/settings')} testID="nav-settings" />
    </Screen>
  );
}
