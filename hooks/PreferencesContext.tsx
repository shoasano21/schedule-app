import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AccentId } from '../constants/accents';

const KEY = 'schedule-app:preferences:v1';

export type AppearanceMode = 'system' | 'light' | 'dark';

interface Preferences {
  accent: AccentId;
  appearance: AppearanceMode;
  /** 月間グリッドの表示開始時刻 (0-23) */
  gridStartHour: number;
  /** 月間グリッドの表示終了時刻 (gridStartHour < gridEndHour <= 24) */
  gridEndHour: number;
}

const DEFAULTS: Preferences = {
  accent: 'blue',
  appearance: 'system',
  gridStartHour: 0,
  gridEndHour: 24,
};

interface ContextValue extends Preferences {
  setAccent: (id: AccentId) => void;
  setAppearance: (mode: AppearanceMode) => void;
  setGridRange: (start: number, end: number) => void;
  hydrated: boolean;
}

const Context = createContext<ContextValue>({
  ...DEFAULTS,
  hydrated: false,
  setAccent: () => {},
  setAppearance: () => {},
  setGridRange: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULTS.accent);
  const [appearance, setAppearanceState] = useState<AppearanceMode>(DEFAULTS.appearance);
  const [gridStartHour, setGridStartState] = useState<number>(DEFAULTS.gridStartHour);
  const [gridEndHour, setGridEndState] = useState<number>(DEFAULTS.gridEndHour);
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
            if (
              parsed &&
              typeof parsed.gridStartHour === 'number' &&
              typeof parsed.gridEndHour === 'number' &&
              parsed.gridStartHour >= 0 &&
              parsed.gridEndHour <= 24 &&
              parsed.gridStartHour < parsed.gridEndHour
            ) {
              setGridStartState(parsed.gridStartHour);
              setGridEndState(parsed.gridEndHour);
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
    const merged = { accent, appearance, gridStartHour, gridEndHour, ...next };
    AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
  }, [accent, appearance, gridStartHour, gridEndHour]);

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id);
    persist({ accent: id });
  }, [persist]);

  const setAppearance = useCallback((mode: AppearanceMode) => {
    setAppearanceState(mode);
    persist({ appearance: mode });
  }, [persist]);

  const setGridRange = useCallback((start: number, end: number) => {
    if (start < 0 || end > 24 || start >= end) return;
    setGridStartState(start);
    setGridEndState(end);
    persist({ gridStartHour: start, gridEndHour: end });
  }, [persist]);

  return (
    <Context.Provider
      value={{
        accent,
        appearance,
        gridStartHour,
        gridEndHour,
        setAccent,
        setAppearance,
        setGridRange,
        hydrated,
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function usePreferences(): ContextValue {
  return useContext(Context);
}
