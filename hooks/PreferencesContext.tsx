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
  /** 月間ヘッダーに天気アイコンを表示 (Open-Meteo, 東京) */
  weatherEnabled: boolean;
}

const DEFAULTS: Preferences = {
  accent: 'blue',
  appearance: 'system',
  gridStartHour: 0,
  gridEndHour: 24,
  weatherEnabled: false,
};

interface ContextValue extends Preferences {
  setAccent: (id: AccentId) => void;
  setAppearance: (mode: AppearanceMode) => void;
  setGridRange: (start: number, end: number) => void;
  setWeatherEnabled: (v: boolean) => void;
  hydrated: boolean;
}

const Context = createContext<ContextValue>({
  ...DEFAULTS,
  hydrated: false,
  setAccent: () => {},
  setAppearance: () => {},
  setGridRange: () => {},
  setWeatherEnabled: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULTS.accent);
  const [appearance, setAppearanceState] = useState<AppearanceMode>(DEFAULTS.appearance);
  const [gridStartHour, setGridStartState] = useState<number>(DEFAULTS.gridStartHour);
  const [gridEndHour, setGridEndState] = useState<number>(DEFAULTS.gridEndHour);
  const [weatherEnabled, setWeatherState] = useState<boolean>(DEFAULTS.weatherEnabled);
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
            if (parsed && typeof parsed.weatherEnabled === 'boolean') {
              setWeatherState(parsed.weatherEnabled);
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
    const merged = { accent, appearance, gridStartHour, gridEndHour, weatherEnabled, ...next };
    AsyncStorage.setItem(KEY, JSON.stringify(merged)).catch(() => {});
  }, [accent, appearance, gridStartHour, gridEndHour, weatherEnabled]);

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

  const setWeatherEnabled = useCallback((v: boolean) => {
    setWeatherState(v);
    persist({ weatherEnabled: v });
  }, [persist]);

  return (
    <Context.Provider
      value={{
        accent,
        appearance,
        gridStartHour,
        gridEndHour,
        weatherEnabled,
        setAccent,
        setAppearance,
        setGridRange,
        setWeatherEnabled,
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
