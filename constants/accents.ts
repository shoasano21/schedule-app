export type AccentId =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'orange'
  | 'green'
  | 'red'
  | 'teal'
  | 'indigo';

export interface AccentVariant {
  fg: string;
  bg: string;
  bgFaint: string;
}

export interface AccentPreset {
  id: AccentId;
  label: string;
  light: AccentVariant;
  dark: AccentVariant;
}

export const ACCENT_PRESETS: Record<AccentId, AccentPreset> = {
  blue: {
    id: 'blue',
    label: 'ブルー',
    light: { fg: '#0A84FF', bg: 'rgba(0,122,255,0.12)', bgFaint: 'rgba(0,122,255,0.03)' },
    dark: { fg: '#5AC8FA', bg: 'rgba(10,132,255,0.18)', bgFaint: 'rgba(10,132,255,0.06)' },
  },
  purple: {
    id: 'purple',
    label: 'パープル',
    light: { fg: '#AF52DE', bg: 'rgba(175,82,222,0.14)', bgFaint: 'rgba(175,82,222,0.04)' },
    dark: { fg: '#BF5AF2', bg: 'rgba(191,90,242,0.22)', bgFaint: 'rgba(191,90,242,0.08)' },
  },
  pink: {
    id: 'pink',
    label: 'ピンク',
    light: { fg: '#FF2D55', bg: 'rgba(255,45,85,0.14)', bgFaint: 'rgba(255,45,85,0.04)' },
    dark: { fg: '#FF375F', bg: 'rgba(255,55,95,0.20)', bgFaint: 'rgba(255,55,95,0.07)' },
  },
  orange: {
    id: 'orange',
    label: 'オレンジ',
    light: { fg: '#FF9500', bg: 'rgba(255,149,0,0.16)', bgFaint: 'rgba(255,149,0,0.05)' },
    dark: { fg: '#FF9F0A', bg: 'rgba(255,159,10,0.24)', bgFaint: 'rgba(255,159,10,0.08)' },
  },
  green: {
    id: 'green',
    label: 'グリーン',
    light: { fg: '#2BA84A', bg: 'rgba(43,168,74,0.14)', bgFaint: 'rgba(43,168,74,0.04)' },
    dark: { fg: '#30D158', bg: 'rgba(48,209,88,0.22)', bgFaint: 'rgba(48,209,88,0.08)' },
  },
  red: {
    id: 'red',
    label: 'レッド',
    light: { fg: '#FF3B30', bg: 'rgba(255,59,48,0.14)', bgFaint: 'rgba(255,59,48,0.04)' },
    dark: { fg: '#FF453A', bg: 'rgba(255,69,58,0.22)', bgFaint: 'rgba(255,69,58,0.08)' },
  },
  teal: {
    id: 'teal',
    label: 'ティール',
    light: { fg: '#30B0C7', bg: 'rgba(48,176,199,0.14)', bgFaint: 'rgba(48,176,199,0.04)' },
    dark: { fg: '#64D2FF', bg: 'rgba(100,210,255,0.20)', bgFaint: 'rgba(100,210,255,0.07)' },
  },
  indigo: {
    id: 'indigo',
    label: 'インディゴ',
    light: { fg: '#5856D6', bg: 'rgba(88,86,214,0.14)', bgFaint: 'rgba(88,86,214,0.04)' },
    dark: { fg: '#7D7AFF', bg: 'rgba(94,92,230,0.22)', bgFaint: 'rgba(94,92,230,0.08)' },
  },
};

export const ACCENT_IDS: AccentId[] = [
  'blue',
  'purple',
  'pink',
  'red',
  'orange',
  'green',
  'teal',
  'indigo',
];
