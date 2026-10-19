import { IronSetHelper } from '@/features/clubs/IronSetHelper';
import { Screen } from '@/ui/components';

export default function IronSetRoute() {
  return (
    <Screen testID="iron-set">
      <IronSetHelper />
    </Screen>
  );
}
