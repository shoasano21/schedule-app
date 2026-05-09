import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENT_PRESETS } from '../constants/accents';
import { darkTheme, lightTheme, type Theme } from '../constants/colors';
import { usePreferences } from './PreferencesContext';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const { accent: accentId } = usePreferences();

  return useMemo(() => {
    const base = scheme === 'dark' ? darkTheme : lightTheme;
    const preset = ACCENT_PRESETS[accentId];
    if (!preset) return base;
    const variant = scheme === 'dark' ? preset.dark : preset.light;
    return {
      ...base,
      accent: variant.fg,
      accentBg: variant.bg,
      todayBg: variant.bgFaint,
    };
  }, [scheme, accentId]);
}
