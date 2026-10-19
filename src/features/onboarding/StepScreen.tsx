import { OnboardingStep } from '@/domain/onboarding';
import { useQuery, useUnits } from '@/services/AppServices';
import { Loading } from '@/ui/components';

import { StepMode } from './StepFrame';
import { BaselineStep } from './steps/BaselineStep';
import { ClubsStep } from './steps/ClubsStep';
import { ComfortStep } from './steps/ComfortStep';
import { ExperienceStep } from './steps/ExperienceStep';
import { GoalsStep } from './steps/GoalsStep';
import { PracticeStep } from './steps/PracticeStep';
import { ReviewStep } from './steps/ReviewStep';
import { WelcomeStep } from './steps/WelcomeStep';

/** Loads the profile once, then renders the step's form with it as initial state. */
export function StepScreen({ step, mode, returnToReview }: { step: OnboardingStep; mode: StepMode; returnToReview?: boolean }) {
  const profileQuery = useQuery((s) => s.repos.profile.getProfile(s.ownerId), [step]);
  const units = useUnits();
  if (step === 'welcome') return <WelcomeStep />;
  if (!profileQuery.data || !units) return <Loading />;
  // The key remounts forms when switching steps so each starts from saved data.
  const common = { mode, returnToReview, profile: profileQuery.data, units };
  switch (step) {
    case 'experience':
      return <ExperienceStep key={step} {...common} />;
    case 'comfort':
      return <ComfortStep key={step} {...common} />;
    case 'goals':
      return <GoalsStep key={step} {...common} />;
    case 'practice':
      return <PracticeStep key={step} {...common} />;
    case 'clubs':
      return <ClubsStep key={step} mode={mode} returnToReview={returnToReview} />;
    case 'baseline':
      return <BaselineStep key={step} {...common} />;
    case 'review':
      return <ReviewStep key={step} {...common} />;
  }
}
