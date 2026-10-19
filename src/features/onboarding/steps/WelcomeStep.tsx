import { useRouter } from 'expo-router';

import { advance, exploreWithEmptyProfile } from '@/domain/onboarding';
import { useServices } from '@/services/AppServices';
import { View } from 'react-native';

import { Wordmark } from '@/ui/Brand';
import { AppText, Button, Card, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

const POINTS = [
  'Every question is optional. Skip anything and change answers later in My Game.',
  'Stored privately on this device. Cloud backup is not available yet.',
  'Nothing is invented: no made-up distances, scores or swing faults. Unknown stays unknown.',
  'Swing analysis is planned for the iPhone app (M1). Videos will be processed on your phone, not uploaded.',
  'BadGolfer supports your practice. It does not replace a PGA professional or other qualified coach.',
];

export function WelcomeStep() {
  const { repos, ownerId, invalidate, storageLabel, persistent } = useServices();
  const router = useRouter();

  return (
    <Screen testID="step-welcome">
      <View style={{ alignItems: 'flex-start', paddingTop: space.sm }}>
        <Wordmark size={30} withTagline />
      </View>
      <AppText variant="title">Welcome</AppText>
      <AppText muted>Every golfer has something to work on. BadGolfer helps you find yours and improve — beginner or scratch — using only your own answers and evidence.</AppText>
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">Before you start</AppText>
          {POINTS.map((p) => (
            <AppText key={p} variant="caption">
              • {p}
            </AppText>
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
