import type { ColorId } from '../types/Event';

export interface ColorSet {
  bg: string;
  fg: string;
  border: string;
}

export interface Palette {
  blue: ColorSet;
  teal: ColorSet;
  green: ColorSet;
  orange: ColorSet;
  red: ColorSet;
  pink: ColorSet;
  purple: ColorSet;
  indigo: ColorSet;
  brown: ColorSet;
  gray: ColorSet;
}

export const lightPalette: Palette = {
  blue:   { bg: 'rgba(0,122,255,0.14)',   fg: '#0A84FF', border: 'rgba(0,122,255,0.32)' },
  teal:   { bg: 'rgba(48,176,199,0.14)',  fg: '#30B0C7', border: 'rgba(48,176,199,0.32)' },
  green:  { bg: 'rgba(52,199,89,0.14)',   fg: '#2BA84A', border: 'rgba(52,199,89,0.32)' },
  orange: { bg: 'rgba(255,149,0,0.16)',   fg: '#FF9500', border: 'rgba(255,149,0,0.34)' },
  red:    { bg: 'rgba(255,59,48,0.14)',   fg: '#FF3B30', border: 'rgba(255,59,48,0.32)' },
  pink:   { bg: 'rgba(255,45,85,0.14)',   fg: '#FF2D55', border: 'rgba(255,45,85,0.32)' },
  purple: { bg: 'rgba(175,82,222,0.14)',  fg: '#AF52DE', border: 'rgba(175,82,222,0.32)' },
  indigo: { bg: 'rgba(88,86,214,0.14)',   fg: '#5856D6', border: 'rgba(88,86,214,0.32)' },
  brown:  { bg: 'rgba(162,132,94,0.18)',  fg: '#8B6F47', border: 'rgba(162,132,94,0.34)' },
  gray:   { bg: 'rgba(142,142,147,0.18)', fg: '#6E6E73', border: 'rgba(142,142,147,0.34)' },
};

export const darkPalette: Palette = {
  blue:   { bg: 'rgba(10,132,255,0.22)',   fg: '#5AC8FA', border: 'rgba(10,132,255,0.5)' },
  teal:   { bg: 'rgba(100,210,255,0.22)',  fg: '#64D2FF', border: 'rgba(100,210,255,0.5)' },
  green:  { bg: 'rgba(48,209,88,0.22)',    fg: '#30D158', border: 'rgba(48,209,88,0.5)' },
  orange: { bg: 'rgba(255,159,10,0.24)',   fg: '#FF9F0A', border: 'rgba(255,159,10,0.5)' },
  red:    { bg: 'rgba(255,69,58,0.22)',    fg: '#FF453A', border: 'rgba(255,69,58,0.5)' },
  pink:   { bg: 'rgba(255,55,95,0.22)',    fg: '#FF375F', border: 'rgba(255,55,95,0.5)' },
  purple: { bg: 'rgba(191,90,242,0.22)',   fg: '#BF5AF2', border: 'rgba(191,90,242,0.5)' },
  indigo: { bg: 'rgba(94,92,230,0.22)',    fg: '#7D7AFF', border: 'rgba(94,92,230,0.5)' },
  brown:  { bg: 'rgba(172,142,104,0.24)',  fg: '#AC8E68', border: 'rgba(172,142,104,0.5)' },
  gray:   { bg: 'rgba(174,174,178,0.22)',  fg: '#AEAEB2', border: 'rgba(174,174,178,0.5)' },
};

export interface Theme {
  palette: Palette;
  bg: string;
  bgSecondary: string;
  bgElevated: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  separator: string;
  separatorStrong: string;
  accent: string;
  accentBg: string;
  todayBg: string;
  nowLine: string;
  shadow: string;
}

export const lightTheme: Theme = {
  palette: lightPalette,
  bg: '#FFFFFF',
  bgSecondary: '#F2F2F7',
  bgElevated: '#FFFFFF',
  text: '#000000',
  textSecondary: '#3C3C43',
  textTertiary: '#8E8E93',
  separator: 'rgba(60,60,67,0.12)',
  separatorStrong: 'rgba(60,60,67,0.2)',
  accent: '#007AFF',
  accentBg: 'rgba(0,122,255,0.12)',
  todayBg: 'rgba(0,122,255,0.03)',
  nowLine: '#FF3B30',
  shadow: 'rgba(0,0,0,0.08)',
};

export const darkTheme: Theme = {
  palette: darkPalette,
  bg: '#000000',
  bgSecondary: '#1C1C1E',
  bgElevated: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textTertiary: '#8E8E93',
  separator: 'rgba(84,84,88,0.4)',
  separatorStrong: 'rgba(84,84,88,0.65)',
  accent: '#0A84FF',
  accentBg: 'rgba(10,132,255,0.18)',
  todayBg: 'rgba(10,132,255,0.06)',
  nowLine: '#FF453A',
  shadow: 'rgba(0,0,0,0.4)',
};

export function getColorSet(palette: Palette, id: ColorId): ColorSet {
  return palette[id];
}
