import { Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from './theme';

/** Customer-facing product name and the (proposed, not yet approved) tagline. */
export const BRAND = {
  name: 'BadGolfer',
  /** Proposed tagline — not an approved permanent marketing line. Change it here only. */
  tagline: 'Get Better.',
} as const;

const DIMPLES: [number, number][] = [
  [250, 680], [300, 664], [350, 680], [226, 730], [276, 718], [326, 718], [374, 730], [250, 778], [300, 770], [350, 778],
];

/** The BadGolfer mark (same artwork as the app icon, assets/brand/mark.svg). */
export function BrandMark({ size = 40, framed = true }: { size?: number; framed?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {framed ? <Rect width={1024} height={1024} rx={230} fill="#0E4A33" /> : null}
      <G>
        <Path d="M330 690 C 430 560, 560 430, 760 300" fill="none" stroke="#C6F15A" strokeWidth={64} strokeLinecap="round" />
        <Path d="M640 262 L 800 272 L 772 430" fill="none" stroke="#C6F15A" strokeWidth={64} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={300} cy={724} r={150} fill="#FFFFFF" />
        {DIMPLES.map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={17} fill="#D7E2DB" />
        ))}
      </G>
    </Svg>
  );
}

/** "BadGolfer" wordmark, optionally with the mark and tagline. */
export function Wordmark({ size = 22, withMark = true, withTagline = false }: { size?: number; withMark?: boolean; withTagline?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.4 }} accessible accessibilityRole="header" accessibilityLabel={withTagline ? `${BRAND.name}. ${BRAND.tagline}` : BRAND.name}>
      {withMark ? <BrandMark size={size * 1.6} /> : null}
      <View>
        <Text style={{ fontSize: size, lineHeight: size * 1.2, color: t.text, letterSpacing: -0.3 }}>
          <Text style={{ fontWeight: '400' }}>Bad</Text>
          <Text style={{ fontWeight: '800', color: t.primary }}>Golfer</Text>
        </Text>
        {withTagline ? <Text style={{ fontSize: size * 0.55, color: t.textMuted, fontWeight: '600' }}>{BRAND.tagline}</Text> : null}
      </View>
    </View>
  );
}
