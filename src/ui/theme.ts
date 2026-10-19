import { useColorScheme } from 'react-native';

export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  info: string;
  infoSoft: string;
  clubHead: string;
  clubHeadStroke: string;
  clubFace: string;
}

const light: Theme = {
  dark: false,
  bg: '#F4F6F3',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEFE9',
  text: '#15201A',
  textMuted: '#55635A',
  border: '#CDD6CF',
  primary: '#1E6B47',
  onPrimary: '#FFFFFF',
  primarySoft: '#DCEFE4',
  danger: '#B3261E',
  dangerSoft: '#FBE4E2',
  warning: '#8A5A00',
  warningSoft: '#FFF1D6',
  info: '#1D4E89',
  infoSoft: '#E1ECFA',
  clubHead: '#3A4A42',
  clubHeadStroke: '#1C2621',
  clubFace: '#B9C4BE',
};

const dark: Theme = {
  dark: true,
  bg: '#0F1512',
  surface: '#18211C',
  surfaceAlt: '#212C26',
  text: '#E8EFEA',
  textMuted: '#A3B1A8',
  border: '#33423A',
  primary: '#5BC48D',
  onPrimary: '#06200F',
  primarySoft: '#1C3A2A',
  danger: '#FF8A80',
  dangerSoft: '#3A1D1B',
  warning: '#F4C26B',
  warningSoft: '#3A2E14',
  info: '#8DB8F2',
  infoSoft: '#1A2A40',
  clubHead: '#A9B8AF',
  clubHeadStroke: '#E8EFEA',
  clubFace: '#55635A',
};

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 16 } as const;
