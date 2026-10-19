import { Stack, useLocalSearchParams } from 'expo-router';

import { getClubType } from '@/domain/clubCatalog';
import { ClubForm } from '@/features/clubs/ClubForm';
import { useUnits } from '@/services/AppServices';
import { Loading, NotAvailable, Screen } from '@/ui/components';

export default function AddClubRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const units = useUnits();
  const def = type ? getClubType(type) : undefined;
  if (!units) return <Loading />;
  return (
    <Screen testID="add-club-screen">
      <Stack.Screen options={{ title: def ? `Add ${def.label}` : 'Add club' }} />
      {def ? <ClubForm typeCode={def.code} club={null} inBag={false} units={units} /> : <NotAvailable title="Choose a club type" detail="Open the Club Face Gallery and pick a tile." />}
    </Screen>
  );
}
