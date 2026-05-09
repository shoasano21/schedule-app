import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AccentId } from '../constants/accents';

const KEY = 'schedule-app:preferences:v1';

interface Preferences {
  accent: AccentId;
}

const DEFAULTS: Preferences = {
  accent: 'blue',
};

interface ContextValue extends Preferences {
  setAccent: (id: AccentId) => void;
  hydrated: boolean;
}

const Context = createContext<ContextValue>({
  ...DEFAULTS,
  hydrated: false,
  setAccent: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [accent, setAccentState] = useState<AccentId>(DEFAULTS.accent);
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

  const setAccent = useCallback((id: AccentId) => {
    setAccentState(id);
    AsyncStorage.setItem(KEY, JSON.stringify({ accent: id })).catch(() => {});
  }, []);

  return (
    <Context.Provider value={{ accent, setAccent, hydrated }}>{children}</Context.Provider>
  );
}

export function usePreferences(): ContextValue {
  return useContext(Context);
}
