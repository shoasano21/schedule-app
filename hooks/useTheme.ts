import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { ACCENT_PRESETS } from '../constants/accents';
import { darkTheme, lightTheme, type Theme } from '../constants/colors';
import { usePreferences } from './PreferencesContext';

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const { accent: accentId, appearance } = usePreferences();

  return useMemo(() => {
    const effectiveScheme =
      appearance === 'system' ? systemScheme : appearance;
    const base = effectiveScheme === 'dark' ? darkTheme : lightTheme;
    const preset = ACCENT_PRESETS[accentId];
    if (!preset) return base;
    const variant = effectiveScheme === 'dark' ? preset.dark : preset.light;
    return {
      ...base,
      accent: variant.fg,
      accentBg: variant.bg,
      todayBg: variant.bgFaint,
    };
  }, [systemScheme, accentId, appearance]);
}
