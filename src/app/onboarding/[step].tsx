import { Redirect, useLocalSearchParams } from 'expo-router';

import { isOnboardingStep } from '@/domain/onboarding';
import { StepScreen } from '@/features/onboarding/StepScreen';

export default function OnboardingStepRoute() {
  const { step, return: ret } = useLocalSearchParams<{ step: string; return?: string }>();
  if (!isOnboardingStep(step)) return <Redirect href="/onboarding/welcome" />;
  return <StepScreen step={step} mode="onboarding" returnToReview={ret === 'review'} />;
}
