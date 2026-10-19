import { useRouter } from 'expo-router';

import { bagCountLabel } from '@/domain/bag';
import { clubDisplayName } from '@/domain/clubs';
import { useQuery } from '@/services/AppServices';
import { AppText, Button, Card, Row, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { ClubGallery } from '../../clubs/ClubGallery';
import { StepFrame, StepProps } from '../StepFrame';

export function ClubsStep(props: StepProps) {
  const router = useRouter();
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [clubs, members] = await Promise.all([s.repos.clubs.list(s.ownerId), s.repos.bags.memberIds(bag.id)]);
    return { clubs, bag, members };
  }).data;
  const clubs = data?.clubs ?? [];
  const counts = new Map<string, number>();
  for (const c of clubs) counts.set(c.typeCode, (counts.get(c.typeCode) ?? 0) + 1);

  return (
    <StepFrame
      step="clubs"
      {...props}
      onSave={async () => true}
      intro="Tap each club you own. Every club gets its own Brand and Model boxes. Nothing is added unless you choose it."
    >
      <Card tone={clubs.length ? 'primary' : 'default'}>
        <Stack gap={space.sm}>
          <AppText variant="subheading" testID="clubs-step-summary">
            {clubs.length === 0 ? 'No clubs added yet' : `${clubs.length} ${clubs.length === 1 ? 'club' : 'clubs'} in My Clubs`}
          </AppText>
          {data ? <AppText muted>{bagCountLabel(data.bag.kind, data.members.length)}</AppText> : null}
          {clubs.length > 0 ? (
            <AppText variant="caption" muted>
              {clubs.map((c) => `${clubDisplayName(c)}${c.brand ? ` (${c.brand})` : ''}`).join(' · ')}
            </AppText>
          ) : null}
          <Row wrap gap={space.sm}>
            <Button compact variant="secondary" label="Add iron set" onPress={() => router.push('/clubs/iron-set')} />
            <Button compact variant="secondary" label="Build My Bag" onPress={() => router.push('/bag')} testID="open-bag" />
            <Button compact variant="ghost" label="My Clubs" onPress={() => router.push('/clubs')} />
          </Row>
        </Stack>
      </Card>
      <ClubGallery ownedCounts={counts} onSelect={(type) => router.push({ pathname: '/clubs/add', params: { type: type.code } })} />
    </StepFrame>
  );
}
