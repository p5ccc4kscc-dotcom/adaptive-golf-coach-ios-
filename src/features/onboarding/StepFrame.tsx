import { useRouter } from 'expo-router';
import { ReactNode } from 'react';
import { View } from 'react-native';

import {
  ONBOARDING_STEPS,
  ONBOARDING_STEP_TITLES,
  OnboardingStep,
  advance,
  goTo,
  isSkippable,
  previousStep,
  stepIndex,
} from '@/domain/onboarding';
import { useServices } from '@/services/AppServices';
import { AppText, Button, ProgressBar, Row, Screen, Stack } from '@/ui/components';
import { goBackOr } from '@/ui/navigation';
import { space } from '@/ui/theme';

export type StepMode = 'onboarding' | 'edit';

export interface StepProps {
  mode: StepMode;
  /** When set during onboarding, Save returns to the Review step. */
  returnToReview?: boolean;
}

/**
 * Shared chrome for onboarding steps: progress, Back, Skip, Save & Continue.
 * In edit mode (My Game → Player Profile) it shows Save / Cancel instead.
 * `onSave` returns false when validation fails, which keeps the golfer here.
 */
export function StepFrame({
  step,
  mode,
  returnToReview,
  onSave,
  children,
  intro,
  footer,
}: StepProps & { step: OnboardingStep; onSave: () => Promise<boolean>; children: ReactNode; intro?: string; footer?: ReactNode }) {
  const { repos, ownerId, invalidate } = useServices();
  const router = useRouter();
  const index = stepIndex(step);

  const persistAndGo = async (how: 'saved' | 'skipped') => {
    if (how === 'saved' && !(await onSave())) return;
    if (mode === 'edit') {
      invalidate();
      goBackOr(router, '/game');
      return;
    }
    const now = new Date().toISOString();
    let progress = advance(await repos.onboarding.get(ownerId), step, how, now);
    if (returnToReview) progress = goTo(progress, 'review', now);
    await repos.onboarding.save(progress);
    invalidate();
    if (returnToReview && router.canGoBack()) router.back();
    else router.replace(`/onboarding/${progress.currentStep}`);
  };

  const back = async () => {
    const prev = previousStep(step);
    if (!prev) return;
    // Keep what has been typed so far; stay if it is invalid so nothing is silently lost.
    if (!(await onSave())) return;
    await repos.onboarding.save(goTo(await repos.onboarding.get(ownerId), prev, new Date().toISOString()));
    invalidate();
    router.replace(`/onboarding/${prev}`);
  };

  return (
    <Screen testID={`step-${step}`}>
      {mode === 'onboarding' ? (
        <Stack gap={space.xs}>
          <AppText variant="caption" muted>
            Step {index + 1} of {ONBOARDING_STEPS.length}
          </AppText>
          <ProgressBar value={index + 1} max={ONBOARDING_STEPS.length} label={`Setup progress: step ${index + 1} of ${ONBOARDING_STEPS.length}`} />
        </Stack>
      ) : null}
      <AppText variant="title">{ONBOARDING_STEP_TITLES[step]}</AppText>
      {intro ? <AppText muted>{intro}</AppText> : null}
      {children}
      <View style={{ height: space.md }} />
      {footer ?? (mode === 'onboarding' ? (
        <Stack gap={space.sm}>
          <Button label={returnToReview ? 'Save & return to review' : 'Save & Continue'} onPress={() => persistAndGo('saved')} testID="save-continue" />
          <Row gap={space.sm}>
            {previousStep(step) ? <Button label="Back" variant="secondary" onPress={back} style={{ flex: 1 }} testID="back" /> : null}
            {isSkippable(step) ? (
              <Button
                label="Skip for now"
                variant="ghost"
                onPress={() => persistAndGo('skipped')}
                style={{ flex: 1 }}
                accessibilityHint="Leaves this step blank. You can fill it in later from My Game."
                testID="skip"
              />
            ) : null}
          </Row>
        </Stack>
      ) : (
        <Row gap={space.sm}>
          <Button label="Cancel" variant="secondary" onPress={() => goBackOr(router, '/game')} style={{ flex: 1 }} />
          <Button label="Save" onPress={() => persistAndGo('saved')} style={{ flex: 1 }} testID="save" />
        </Row>
      ))}
    </Screen>
  );
}

/** Helper for steps: true if no errors. */
export const noErrors = (errors: Record<string, string>) => Object.keys(errors).length === 0;
