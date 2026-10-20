import { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/** Original line icons for the tab bar (24 pt). */
type IconProps = { color: ColorValue; size?: number };

const stroke = (color: ColorValue) => ({ stroke: color as string, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export function TodayIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} {...stroke(color)} />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...stroke(color)} />
    </Svg>
  );
}

export function AnalyseIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" {...stroke(color)} />
      <Circle cx={12} cy={7.5} r={1.8} {...stroke(color)} />
      <Path d="M12 9.5v5M9 12l3-1.5 3 1.5M10 19l2-4.5 2 4.5" {...stroke(color)} />
    </Svg>
  );
}

export function LearnIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3 6.5 12 3l9 3.5-9 3.5-9-3.5Z" {...stroke(color)} />
      <Path d="M7 8.5V14c0 1.7 2.2 3 5 3s5-1.3 5-3V8.5M21 6.5V12" {...stroke(color)} />
    </Svg>
  );
}

export function RoundsIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 21V3l9 4-9 4" {...stroke(color)} />
      <Path d="M4 21h12" {...stroke(color)} />
    </Svg>
  );
}

export function MyGameIcon({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20V14M10 20V9M16 20V12M22 20H2M4 9l6-5 6 4 5-4" {...stroke(color)} />
    </Svg>
  );
}
