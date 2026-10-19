import { AppText, Card, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

export function LearnScreen() {
  return (
    <Screen testID="learn">
      <NotAvailable
        title="Coaching paths, verified lessons and drills"
        milestone="M2"
        detail="The curriculum, source-verified lesson links and original drill cards are built in M2. No lessons are shown until their sources have been checked."
      />
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">How progress will work</AppText>
          <AppText>Finishing a lesson is not the same as mastering a skill. Mastery will need repeated, skill-specific evidence — for example meeting a target on several separate days — not one good swing.</AppText>
          <AppText>A mastered skill keeps its history. A refresher is suggested only when reliable, comparable evidence shows a real decline — never after one bad session or one unclear video.</AppText>
          <AppText>Experienced golfers can show what they can already do and skip beginner material.</AppText>
        </Stack>
      </Card>
    </Screen>
  );
}
