import { useRouter } from 'expo-router';

import { advance, exploreWithEmptyProfile } from '@/domain/onboarding';
import { useServices } from '@/services/AppServices';
import { AppText, Button, Card, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

const POINTS = [
  'Your swing videos will be processed on this device. They are not uploaded anywhere.',
  'Everything you enter is stored locally first. Optional iCloud backup needs extra setup and is not switched on.',
  'Every question is optional. You can skip any step and change answers later in My Game.',
  'The app will never invent measurements, distances, scores or swing faults. Unknown stays unknown.',
  'This app supports your practice. It is not a substitute for a PGA professional or other qualified coach.',
];

export function WelcomeStep() {
  const { repos, ownerId, invalidate, storageLabel, persistent } = useServices();
  const router = useRouter();

  return (
    <Screen testID="step-welcome">
      <AppText variant="title">Welcome</AppText>
      <AppText muted>A private golf coach that learns from your own answers and evidence — nobody else’s.</AppText>
      <Card>
        <Stack gap={space.md}>
          <AppText variant="subheading">Before you start</AppText>
          {POINTS.map((p) => (
            <AppText key={p}>• {p}</AppText>
          ))}
        </Stack>
      </Card>
      <Card tone={persistent ? 'info' : 'warning'}>
        <AppText variant="caption">{storageLabel}</AppText>
      </Card>
      <Stack gap={space.sm}>
        <Button
          label="Get started"
          testID="get-started"
          accessibilityHint="Begins a short, skippable setup. Around three to five minutes."
          onPress={async () => {
            const p = advance(await repos.onboarding.get(ownerId), 'welcome', 'saved', new Date().toISOString());
            await repos.onboarding.save(p);
            invalidate();
            router.replace('/onboarding/experience');
          }}
        />
        <Button
          label="Explore with an empty profile"
          variant="secondary"
          testID="explore-empty"
          accessibilityHint="Skips setup. Nothing is filled in for you; you can set up later from My Game."
          onPress={async () => {
            await repos.onboarding.save(exploreWithEmptyProfile(await repos.onboarding.get(ownerId), new Date().toISOString()));
            invalidate();
            router.replace('/today');
          }}
        />
      </Stack>
    </Screen>
  );
}
