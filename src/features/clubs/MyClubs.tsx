import { useRouter } from 'expo-router';
import { useState } from 'react';

import { bagCountLabel, bagLimitMessage } from '@/domain/bag';
import { CLUB_CATEGORIES } from '@/domain/clubCatalog';
import { clubDisplayName, effectiveCategory } from '@/domain/clubs';
import { useQuery, useServices, useUnits } from '@/services/AppServices';
import { AppText, Button, Card, ChoiceChips, Row, SectionHeader, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

import { ClubCard } from './ClubCard';

export function MyClubs() {
  const { repos, invalidate } = useServices();
  const router = useRouter();
  const units = useUnits();
  const [view, setView] = useState<'grouped' | 'list'>('grouped');
  const [message, setMessage] = useState<string | null>(null);
  const data = useQuery(async (s) => {
    const bag = await s.repos.bags.ensureDefault(s.ownerId);
    const [clubs, archived, memberIds, distances] = await Promise.all([
      s.repos.clubs.list(s.ownerId),
      s.repos.clubs.listArchived(s.ownerId),
      s.repos.bags.memberIds(bag.id),
      s.repos.distances.listForOwner(s.ownerId),
    ]);
    return { bag, clubs, archived, memberIds: new Set(memberIds), distances };
  }).data;
  if (!data || !units) return null;
  const { bag, clubs, archived, memberIds, distances } = data;

  const toggle = async (clubId: string, name: string) => {
    setMessage(null);
    if (memberIds.has(clubId)) await repos.bags.removeClub(bag.id, clubId);
    else {
      const r = await repos.bags.addClub(bag.id, clubId);
      if (!r.ok && r.reason === 'limit_reached') setMessage(`${name} was not added. ${bagLimitMessage()}`);
    }
    invalidate();
  };

  const card = (c: (typeof clubs)[number]) => (
    <ClubCard
      key={c.id}
      club={c}
      inBag={memberIds.has(c.id)}
      onToggleBag={() => toggle(c.id, clubDisplayName(c))}
      onPress={() => router.push(`/clubs/${c.id}`)}
      observations={distances.filter((d) => d.clubInstanceId === c.id)}
      distanceUnit={units.distanceUnit}
    />
  );

  return (
    <Stack gap={space.lg}>
      <Card>
        <Stack gap={space.xs}>
          <AppText variant="subheading" testID="owned-count">
            {clubs.length} {clubs.length === 1 ? 'club' : 'clubs'} owned
          </AppText>
          <AppText muted>
            Current bag “{bag.name}”: {bagCountLabel(bag.kind, memberIds.size)}
          </AppText>
        </Stack>
      </Card>
      <Row wrap gap={space.sm}>
        <Button compact label="Add a club" onPress={() => router.push('/clubs/catalogue')} testID="add-club" />
        <Button compact variant="secondary" label="Add iron set" onPress={() => router.push('/clubs/iron-set')} testID="add-iron-set" />
        <Button compact variant="secondary" label="Build My Bag" onPress={() => router.push('/bag')} testID="open-bag" />
      </Row>
      {message ? <AppText variant="caption">{message}</AppText> : null}

      {clubs.length === 0 ? (
        <Card>
          <Stack gap={space.sm}>
            <AppText variant="subheading">No clubs added</AppText>
            <AppText muted>Your inventory starts empty. Add only the clubs you actually own — you can add more at any time.</AppText>
            <Button label="Add your first club" onPress={() => router.push('/clubs/catalogue')} testID="add-first-club" />
          </Stack>
        </Card>
      ) : (
        <>
          <ChoiceChips
            label="View"
            options={[
              { value: 'grouped' as const, label: 'By category' },
              { value: 'list' as const, label: 'Bag order list' },
            ]}
            value={view}
            onChange={(v) => v && setView(v)}
          />
          {view === 'list'
            ? clubs.map(card)
            : CLUB_CATEGORIES.map((cat) => {
                const inCat = clubs.filter((c) => effectiveCategory(c) === cat.category);
                if (inCat.length === 0) return null;
                return (
                  <Stack key={cat.category} gap={space.sm}>
                    <SectionHeader title={cat.label} />
                    {inCat.map(card)}
                  </Stack>
                );
              })}
        </>
      )}

      {archived.length > 0 ? (
        <Stack gap={space.sm}>
          <SectionHeader title="Archived clubs" />
          <AppText variant="caption" muted>
            Kept so past records stay linked. Restore one to use it again.
          </AppText>
          {archived.map((c) => (
            <ClubCard key={c.id} club={c} onPress={() => router.push(`/clubs/${c.id}`)} />
          ))}
        </Stack>
      ) : null}
    </Stack>
  );
}
