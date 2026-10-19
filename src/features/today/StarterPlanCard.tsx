import { ClubInstance } from '@/domain/clubs';
import { PlayerProfile } from '@/domain/profile';
import { buildStarterPlanOutline } from '@/domain/starterPlan';
import { AppText, Badge, Card, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

/** Shows the diagnostic starter outline computed from the golfer's own answers and bag. */
export function StarterPlanCard({ profile, bag }: { profile: PlayerProfile; bag: ClubInstance[] }) {
  const plan = buildStarterPlanOutline(profile, bag);
  return (
    <Card tone="primary" testID="starter-plan">
      <Stack gap={space.sm}>
        <Badge label={`Starter diagnostic · about ${Math.max(10, plan.totalMinutes)}–15 min`} tone="primary" />
        <AppText variant="subheading">Your first practice session</AppText>
        {plan.items.map((item) => (
          <Stack key={item.area} gap={2}>
            <AppText variant="label">
              • {item.title}
              {item.clubLabel ? ` — with your ${item.clubLabel}` : ''}
            </AppText>
            <AppText variant="caption" muted>
              Why: {item.reason}
            </AppText>
          </Stack>
        ))}
        {plan.unavailable.map((u) => (
          <AppText key={u} variant="caption" muted>
            Not included: {u}
          </AppText>
        ))}
        {plan.notes.map((n) => (
          <AppText key={n} variant="caption">
            {n}
          </AppText>
        ))}
      </Stack>
    </Card>
  );
}
