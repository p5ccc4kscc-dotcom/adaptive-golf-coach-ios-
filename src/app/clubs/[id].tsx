import { Stack, useLocalSearchParams } from 'expo-router';

import { clubDisplayName } from '@/domain/clubs';
import { ClubForm } from '@/features/clubs/ClubForm';
import { useQuery, useUnits } from '@/services/AppServices';
import { Loading, NotAvailable, Screen } from '@/ui/components';

export default function EditClubRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const units = useUnits();
  const q = useQuery(
    async (s) => {
      const club = await s.repos.clubs.get(id);
      const bag = await s.repos.bags.ensureDefault(s.ownerId);
      const members = await s.repos.bags.memberIds(bag.id);
      return { club, inBag: club ? members.includes(club.id) : false };
    },
    [id],
  );
  if (!q.data || !units) return <Loading />;
  const { club, inBag } = q.data;
  return (
    <Screen testID="edit-club-screen">
      {club ? (
        <>
          <Stack.Screen options={{ title: clubDisplayName(club) }} />
          {/* key: remount the form when navigating to a duplicated club */}
          <ClubForm key={club.id} typeCode={club.typeCode} club={club} inBag={inBag} units={units} />
        </>
      ) : (
        <NotAvailable title="Club not found" detail="It may have been deleted." />
      )}
    </Screen>
  );
}
