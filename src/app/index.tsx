import { Redirect } from 'expo-router';

import { shouldShowOnboarding } from '@/domain/onboarding';
import { useQuery } from '@/services/AppServices';
import { Loading } from '@/ui/components';

/** Sends a first-time golfer to onboarding (resuming where they left off), everyone else to Today. */
export default function Index() {
  const progress = useQuery((s) => s.repos.onboarding.get(s.ownerId)).data;
  if (!progress) return <Loading />;
  if (shouldShowOnboarding(progress)) return <Redirect href={`/onboarding/${progress.currentStep}`} />;
  return <Redirect href="/today" />;
}
