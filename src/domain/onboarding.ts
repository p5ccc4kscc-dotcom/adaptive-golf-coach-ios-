export const ONBOARDING_STEPS = [
  'welcome',
  'experience',
  'comfort',
  'goals',
  'practice',
  'clubs',
  'baseline',
  'review',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: 'Welcome & privacy',
  experience: 'About your golf',
  comfort: 'Comfort & body fit',
  goals: 'Playing tendencies & goals',
  practice: 'Practice situation',
  clubs: 'Your clubs',
  baseline: 'Baseline (optional)',
  review: 'Review',
};

/** Every step except Welcome and Review may be skipped. */
export function isSkippable(step: OnboardingStep): boolean {
  return step !== 'welcome' && step !== 'review';
}

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'explored_empty';

export interface OnboardingProgress {
  ownerId: string;
  status: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  skippedSteps: OnboardingStep[];
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
}

export function initialProgress(ownerId: string): OnboardingProgress {
  return {
    ownerId,
    status: 'not_started',
    currentStep: 'welcome',
    completedSteps: [],
    skippedSteps: [],
    startedAt: null,
    updatedAt: null,
    completedAt: null,
  };
}

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step);
}

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const i = stepIndex(step);
  return i < ONBOARDING_STEPS.length - 1 ? ONBOARDING_STEPS[i + 1]! : null;
}

export function previousStep(step: OnboardingStep): OnboardingStep | null {
  const i = stepIndex(step);
  return i > 0 ? ONBOARDING_STEPS[i - 1]! : null;
}

export function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** Pure transition: the golfer saved (or skipped) `step` and moves on. */
export function advance(progress: OnboardingProgress, step: OnboardingStep, how: 'saved' | 'skipped', nowIso: string): OnboardingProgress {
  const completed = new Set(progress.completedSteps);
  const skipped = new Set(progress.skippedSteps);
  if (how === 'saved') {
    completed.add(step);
    skipped.delete(step);
  } else {
    skipped.add(step);
  }
  const next = nextStep(step);
  return {
    ...progress,
    status: progress.status === 'completed' ? 'completed' : 'in_progress',
    currentStep: next ?? step,
    completedSteps: ONBOARDING_STEPS.filter((s) => completed.has(s)),
    skippedSteps: ONBOARDING_STEPS.filter((s) => skipped.has(s) && !completed.has(s)),
    startedAt: progress.startedAt ?? nowIso,
    updatedAt: nowIso,
  };
}

export function goTo(progress: OnboardingProgress, step: OnboardingStep, nowIso: string): OnboardingProgress {
  return { ...progress, currentStep: step, startedAt: progress.startedAt ?? nowIso, updatedAt: nowIso };
}

export function complete(progress: OnboardingProgress, nowIso: string): OnboardingProgress {
  const completed = new Set(progress.completedSteps);
  completed.add('review');
  return {
    ...progress,
    status: 'completed',
    currentStep: 'review',
    completedSteps: ONBOARDING_STEPS.filter((s) => completed.has(s)),
    startedAt: progress.startedAt ?? nowIso,
    updatedAt: nowIso,
    completedAt: nowIso,
  };
}

export function exploreWithEmptyProfile(progress: OnboardingProgress, nowIso: string): OnboardingProgress {
  return { ...progress, status: 'explored_empty', startedAt: progress.startedAt ?? nowIso, updatedAt: nowIso };
}

/** The app shows onboarding (instead of the tabs) only while it is not finished and not deliberately bypassed. */
export function shouldShowOnboarding(progress: OnboardingProgress): boolean {
  return progress.status === 'not_started' || progress.status === 'in_progress';
}
