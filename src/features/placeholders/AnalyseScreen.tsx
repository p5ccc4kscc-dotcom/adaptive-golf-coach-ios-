import { Platform } from 'react-native';

import { AppText, Card, NotAvailable, Screen, Stack } from '@/ui/components';
import { space } from '@/ui/theme';

/**
 * M0: the analyser is not built yet. This screen says so plainly and shows
 * the (real) camera-setup guidance it will use. No sample analysis is shown.
 */
export function AnalyseScreen() {
  return (
    <Screen testID="analyse">
      <NotAvailable
        title="Swing video analysis"
        milestone="M1"
        detail={
          Platform.OS === 'web'
            ? 'Arrives in M1 as on-device Apple Vision body tracking inside the iPhone app. It will not run in this browser preview.'
            : 'Arrives in M1: import a video, track body positions on this device with Apple Vision, and see only measurements the clip can support.'
        }
      />
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">What it will and won’t measure</AppText>
          <AppText>Planned (when the view and visibility allow): body positions and movement such as head and hip movement, posture change and timing between marked positions.</AppText>
          <AppText>Never claimed from a phone video of the body alone: clubface angle, club path, face-to-path, club or ball speed, spin, carry distance or strike location.</AppText>
        </Stack>
      </Card>
      <Card>
        <Stack gap={space.sm}>
          <AppText variant="subheading">Filming tips you can use now</AppText>
          <AppText>• Down-the-line: camera behind you, looking along your target line.</AppText>
          <AppText>• Face-on: camera in front of you, at right angles to the target line.</AppText>
          <AppText>• Phone on a stable support at about hand-to-elbow height, whole body and club in frame, good light, uncluttered background, only one golfer in view.</AppText>
          <AppText>• Slow-motion (120 fps or more) helps when convenient; normal 60 fps still works with less timing detail.</AppText>
        </Stack>
      </Card>
    </Screen>
  );
}
