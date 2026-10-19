import { ClubInstance } from '@/domain/clubs';
import { PlayerProfile } from '@/domain/profile';
import { DIAGNOSTIC_NOTE, buildStarterPlanOutline } from '@/domain/starterPlan';
import { AppText, Badge, Card, Disclosure, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

/** Shows the diagnostic starter outline computed from the golfer's own answers and bag. */
export function StarterPlanCard({ profile, bag }: { profile: PlayerProfile; bag: ClubInstance[] }) {
  const plan = buildStarterPlanOutline(profile, bag);
  return (
    <Card tone="primary" testID="starter-plan">
      <Stack gap={space.sm}>
        <Badge label={`Starter diagnostic · about ${Math.max(10, plan.totalMinutes)}–15 min`} tone="primary" />
        <AppText variant="subheading">Your first practice session</AppText>
        {plan.items.map((item, i) => (
          <AppText key={item.area} variant="label">
            {i + 1}. {item.title}
            {item.clubLabel ? ` — with your ${item.clubLabel}` : ''}
          </AppText>
        ))}
        <AppText variant="caption" muted>
          A diagnostic look, not a diagnosis: no fault is assumed until you log real outcomes.
          {plan.unavailable.length ? ` ${plan.unavailable.length} more ${plan.unavailable.length === 1 ? 'area needs a club' : 'areas need clubs'} you haven’t put in your bag.` : ''}
        </AppText>
        <Disclosure label="Why these, and what’s not included" openLabel="Hide details" testID="starter-plan-details">
          {plan.items.map((item) => (
            <AppText key={item.area} variant="caption">
              {item.title}: {item.reason}
            </AppText>
          ))}
          {plan.unavailable.map((u) => (
            <AppText key={u} variant="caption" muted>
              Not included — {u}
            </AppText>
          ))}
          {plan.notes.filter((n) => n !== DIAGNOSTIC_NOTE).map((n) => (
            <AppText key={n} variant="caption">
              {n}
            </AppText>
          ))}
        </Disclosure>
      </Stack>
    </Card>
  );
}
