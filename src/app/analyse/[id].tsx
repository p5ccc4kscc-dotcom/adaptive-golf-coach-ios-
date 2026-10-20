import { useLocalSearchParams } from 'expo-router';

import { SwingVideoScreen } from '@/features/analyse/SwingVideoScreen';

export default function SwingVideoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SwingVideoScreen videoId={String(id)} />;
}
