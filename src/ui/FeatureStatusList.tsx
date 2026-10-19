import { View } from 'react-native';

import { FEATURES, FeatureInfo, featureBadge } from '@/domain/features';

import { AppText, Badge } from './components';
import { space } from './theme';

const TONE = { available: 'primary', experimental: 'info', planned: 'warning' } as const;

/** Compact list of features with their real status. */
export function FeatureStatusList({ features = FEATURES, testID }: { features?: readonly FeatureInfo[]; testID?: string }) {
  return (
    <View style={{ gap: space.sm }} testID={testID}>
      {features.map((f) => (
        <View key={f.id} style={{ gap: 2 }} testID={`feature-${f.id}`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
            <AppText variant="label">{f.name}</AppText>
            <Badge label={featureBadge(f)} tone={TONE[f.status]} />
          </View>
          <AppText variant="caption" muted>
            {f.detail}
          </AppText>
        </View>
      ))}
    </View>
  );
}
