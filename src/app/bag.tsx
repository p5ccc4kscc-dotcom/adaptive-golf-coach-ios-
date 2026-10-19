import { BuildMyBag } from '@/features/clubs/BuildMyBag';
import { Screen } from '@/ui/components';

export default function BagRoute() {
  return (
    <Screen testID="build-my-bag">
      <BuildMyBag />
    </Screen>
  );
}
