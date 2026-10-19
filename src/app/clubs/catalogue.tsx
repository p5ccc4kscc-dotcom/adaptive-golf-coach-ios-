import { useRouter } from 'expo-router';

import { ClubGallery } from '@/features/clubs/ClubGallery';
import { useQuery } from '@/services/AppServices';
import { AppText, Screen } from '@/ui/components';

export default function CatalogueRoute() {
  const router = useRouter();
  const clubs = useQuery((s) => s.repos.clubs.list(s.ownerId)).data ?? [];
  const counts = new Map<string, number>();
  for (const c of clubs) counts.set(c.typeCode, (counts.get(c.typeCode) ?? 0) + 1);
  return (
    <Screen testID="club-catalogue">
      <AppText muted>Every club type, with its own tile. Pick one to add a separate club with its own Brand and Model.</AppText>
      <ClubGallery ownedCounts={counts} onSelect={(type) => router.push({ pathname: '/clubs/add', params: { type: type.code } })} />
    </Screen>
  );
}
