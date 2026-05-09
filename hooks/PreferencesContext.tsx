import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AccentId } from '../constants/accents';

const KEY = 'schedule-app:preferences:v1';

export type AppearanceMode = 'system' | 'light' | 'dark';

interface Preferences {
  accent: AccentId;
  appearance: AppearanceMode;
}

const DEFAULTS: Preferences = {
  accent: 'blue',
  appearance: 'system',
};

interface ContextValue extends Preferences {
  setAccent: (id: AccentId) => void;
  setAppearance: (mode: AppearanceMode) => void;
  hydrated: boolean;
}

const Context = createContext<ContextValue>({
  ...DEFAULTS,
  hydrated: false,
  setAccent: () => {},
  setAppearance: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULTS.accent);
  const [appearance, setAppearanceState] = useState<AppearanceMode>(DEFAULTS.appearance);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.accent === 'string') {
              setAccentState(parsed.accent as AccentId);
            }
            if (
              parsed &&
              (parsed.appearance === 'system' ||
                parsed.appearance === 'light' ||
                parsed.appearance === 'dark')
            ) {
              setAppearanceState(parsed.appearance);
            }
          } catch {}
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Partial<Preferences>) => {
    const merged = { accent, appearance, ...next };
    AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
  }, [accent, appearance]);

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id);
    persist({ accent: id });
  }, [persist]);

  const setAppearance = useCallback((mode: AppearanceMode) => {
    setAppearanceState(mode);
    persist({ appearance: mode });
  }, [persist]);

  return (
    <Context.Provider value={{ accent, appearance, setAccent, setAppearance, hydrated }}>
      {children}
    </Context.Provider>
  );
}

export function usePreferences(): ContextValue {
  return useContext(Context);
}
