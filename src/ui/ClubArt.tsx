import Svg, { G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ClubArtwork } from '@/domain/clubCatalog';

import { useTheme } from './theme';

/**
 * Original, generic, stylised clubhead artwork drawn as SVG. It is
 * illustrative only — not a depiction of any manufacturer's product.
 */

interface Shape {
  head: string;
  hosel: [number, number, number, number];
  grooves: [number, number, number, number][];
  badge: { x: number; y: number };
}

const SHAPES: Record<Exclude<ClubArtwork, 'putter'>, Shape> = {
  driver: {
    head: 'M10 58 Q6 26 38 22 L80 22 Q96 26 94 48 Q92 64 72 64 L22 64 Q11 64 10 58 Z',
    hosel: [80, 22, 88, 2],
    grooves: [],
    badge: { x: 52, y: 49 },
  },
  mini_driver: {
    head: 'M16 58 Q12 32 40 28 L76 28 Q90 31 88 50 Q86 62 70 62 L26 62 Q17 62 16 58 Z',
    hosel: [76, 28, 84, 4],
    grooves: [],
    badge: { x: 52, y: 50 },
  },
  wood: {
    head: 'M20 58 Q16 36 42 33 L74 33 Q86 36 84 52 Q82 62 68 62 L30 62 Q21 62 20 58 Z',
    hosel: [74, 33, 82, 6],
    grooves: [],
    badge: { x: 52, y: 52 },
  },
  hybrid: {
    head: 'M20 60 Q18 42 40 39 L76 37 Q86 40 84 54 Q83 62 70 62 L30 62 Q21 62 20 60 Z',
    hosel: [76, 37, 82, 8],
    grooves: [[38, 44, 70, 42]],
    badge: { x: 53, y: 58 },
  },
  utility_iron: {
    head: 'M14 62 L84 62 Q92 62 90 52 L80 22 Q78 15 71 17 L24 33 Q14 37 14 46 Z',
    hosel: [74, 17, 80, 2],
    grooves: [
      [26, 44, 74, 34],
      [24, 50, 78, 40],
      [16, 56, 86, 56],
    ],
    badge: { x: 50, y: 51 },
  },
  iron: {
    head: 'M14 60 L84 60 Q92 60 90 52 L80 20 Q78 13 71 15 L24 31 Q14 35 14 44 Z',
    hosel: [74, 15, 80, 2],
    grooves: [
      [30, 36, 72, 26],
      [28, 41, 76, 31],
    ],
    badge: { x: 50, y: 56 },
  },
  wedge: {
    head: 'M16 62 L82 62 Q92 62 90 52 L84 16 Q82 8 74 10 L26 26 Q16 30 16 40 Z',
    hosel: [76, 10, 80, 0],
    grooves: [
      [28, 36, 76, 22],
      [26, 42, 80, 28],
      [24, 48, 82, 34],
    ],
    badge: { x: 52, y: 55 },
  },
  chipper: {
    head: 'M16 62 L84 62 Q90 62 88 54 L82 30 Q80 24 74 25 L26 36 Q16 39 16 48 Z',
    hosel: [70, 26, 70, 2],
    grooves: [[28, 46, 76, 40]],
    badge: { x: 52, y: 56 },
  },
  specialty: {
    head: 'M14 60 L84 60 Q92 60 90 52 L80 20 Q78 13 71 15 L24 31 Q14 35 14 44 Z',
    hosel: [74, 15, 80, 2],
    grooves: [],
    badge: { x: 50, y: 50 },
  },
  custom: {
    head: 'M16 60 L84 60 L84 22 L16 22 Z',
    hosel: [70, 22, 76, 2],
    grooves: [],
    badge: { x: 50, y: 47 },
  },
};

export function ClubArt({ artwork, badge, size = 88, putterSubtype }: { artwork: ClubArtwork; badge: string; size?: number; putterSubtype?: string | null }) {
  const t = useTheme();
  const h = (size * 70) / 100;
  const fontSize = badge.length > 3 ? 11 : badge.length > 2 ? 13 : 16;

  if (artwork === 'putter') {
    const mallet = putterSubtype === 'mallet';
    return (
      <Svg width={size} height={h} viewBox="0 0 100 70" accessible={false}>
        <Line x1={50} y1={mallet ? 38 : 44} x2={56} y2={0} stroke={t.clubHeadStroke} strokeWidth={3} strokeLinecap="round" />
        {mallet ? (
          <Path d="M14 62 Q14 36 50 36 Q86 36 86 62 Z" fill={t.clubHead} stroke={t.clubHeadStroke} strokeWidth={2} />
        ) : (
          <Rect x={10} y={44} width={80} height={18} rx={4} fill={t.clubHead} stroke={t.clubHeadStroke} strokeWidth={2} />
        )}
        <Line x1={50} y1={mallet ? 44 : 47} x2={50} y2={60} stroke={t.clubFace} strokeWidth={2} />
        <SvgText x={mallet ? 30 : 26} y={58} fontSize={fontSize} fontWeight="700" fill={t.clubFace} textAnchor="middle">
          {badge}
        </SvgText>
      </Svg>
    );
  }

  const s = SHAPES[artwork];
  return (
    <Svg width={size} height={h} viewBox="0 0 100 70" accessible={false}>
      <Line x1={s.hosel[0]} y1={s.hosel[1]} x2={s.hosel[2]} y2={s.hosel[3]} stroke={t.clubHeadStroke} strokeWidth={3.5} strokeLinecap="round" />
      <Path
        d={s.head}
        fill={t.clubHead}
        stroke={t.clubHeadStroke}
        strokeWidth={2}
        strokeDasharray={artwork === 'custom' ? '6 4' : undefined}
      />
      <G>
        {s.grooves.map(([x1, y1, x2, y2], i) => (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.clubFace} strokeWidth={1.5} strokeLinecap="round" />
        ))}
      </G>
      <SvgText x={s.badge.x} y={s.badge.y} fontSize={fontSize} fontWeight="700" fill={t.dark ? '#121915' : '#FFFFFF'} textAnchor="middle">
        {badge}
      </SvgText>
    </Svg>
  );
}
