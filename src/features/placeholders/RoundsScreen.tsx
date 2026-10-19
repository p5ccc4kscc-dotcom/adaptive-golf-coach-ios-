import { useRouter } from 'expo-router';

import { roundPuttsText } from '@/domain/baseline';
import { formatLocalDate } from '@/domain/dates';
import { useQuery } from '@/services/AppServices';
import { AppText, Button, Card, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

export function RoundsScreen() {
  const router = useRouter();
  const rounds = useQuery((s) => s.repos.baseline.list(s.ownerId)).data ?? [];
  return (
    <Screen testID="rounds" tab title="Rounds & Practice">
      <NotAvailable
        title="Scorecards and practice logging"
        milestone="M3"
        detail="Quick 9- and 18-hole scorecards, putts, penalties and practice sessions arrive in M3. Missing values will stay blank, never zero."
      />
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">Past rounds you entered</AppText>
          {rounds.length === 0 ? <AppText muted>None entered.</AppText> : null}
          {rounds.map((r) => (
            <AppText key={r.id}>
              {formatLocalDate(r.playedOn)} · {r.holes} holes · score {r.totalStrokes ?? 'not entered'} · {roundPuttsText(r)} · self-reported
            </AppText>
          ))}
          <Button label="Add or edit past rounds" variant="secondary" onPress={() => router.push('/profile/baseline')} />
        </Stack>
      </Card>
    </Screen>
  );
}
