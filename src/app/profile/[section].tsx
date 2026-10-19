import { Redirect, Stack, useLocalSearchParams } from 'expo-router';

import { ONBOARDING_STEP_TITLES, isOnboardingStep } from '@/domain/onboarding';
import { StepScreen } from '@/features/onboarding/StepScreen';

/** My Game → Player Profile: the same forms as onboarding, in edit mode. */
export default function ProfileSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  if (!isOnboardingStep(section) || section === 'welcome' || section === 'review') return <Redirect href="/game" />;
  return (
    <>
      <Stack.Screen options={{ title: ONBOARDING_STEP_TITLES[section] }} />
      <StepScreen step={section} mode="edit" />
    </>
  );
}
