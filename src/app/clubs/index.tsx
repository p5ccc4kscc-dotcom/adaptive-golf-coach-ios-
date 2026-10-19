import { MyClubs } from '@/features/clubs/MyClubs';
import { Screen } from '@/ui/components';

export default function MyClubsRoute() {
  return (
    <Screen testID="my-clubs">
      <MyClubs />
    </Screen>
  );
}
