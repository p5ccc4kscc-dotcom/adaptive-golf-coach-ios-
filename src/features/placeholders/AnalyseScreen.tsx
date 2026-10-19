import { NOT_MEASURABLE } from '@/domain/pose/measures';
import { AppText, Card, Disclosure, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

const REASONS = {
  browser: 'Swing analysis uses Apple Vision on the iPhone and is built into the BadGolfer iPhone app (M1a, in testing). It cannot run in this browser preview.',
  not_ios: 'Swing analysis uses Apple Vision and is available only in the iPhone app.',
  module_missing: 'This build does not include the swing-analysis module (for example Expo Go). It needs a BadGolfer development or release build.',
} as const;

/**
 * Shown wherever the on-device analyser is not present. It says so plainly and
 * gives real filming guidance. No sample analysis is ever shown.
 */
export function AnalyseInfo({ reason }: { reason: keyof typeof REASONS }) {
  return (
    <Screen testID="analyse" tab title="Analyse" subtitle="Swing video analysis">
      <NotAvailable title="Swing video analysis" milestone="M1a · iPhone app only" detail={REASONS[reason]} />
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">What it measures, and what it can’t</AppText>
          <AppText variant="caption">
            It finds body joints in each frame and works out timing and 2D positions from them, such as head movement and trunk tilt, with the
            uncertainty shown.
          </AppText>
          <Disclosure label="Never measured from body tracking" openLabel="Hide list" testID="not-measurable">
            <AppText variant="caption">{NOT_MEASURABLE.map((n) => n.label).join(', ')}.</AppText>
          </Disclosure>
        </Stack>
      </Card>
      <Card>
        <Stack gap={space.xs}>
          <AppText variant="subheading">Filming tips you can use now</AppText>
          <AppText variant="caption">• Down the line: camera behind you, looking along your target line.</AppText>
          <AppText variant="caption">• Face-on: camera in front of you, at right angles to the target line.</AppText>
          <AppText variant="caption">• Steady support at about hand height, whole body in frame, good light, only you in view.</AppText>
          <AppText variant="caption">• Slow motion (120–240 fps) gives finer timing; 60 fps still works.</AppText>
        </Stack>
      </Card>
    </Screen>
  );
}
