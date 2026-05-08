import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'schedule-app:title-presets:v1';

export const DEFAULT_TITLE_PRESETS = [
  '読書',
  '英語',
  '数学',
  '化学',
  '物理学',
  '部活',
  'バイト',
];

export function useTitlePresets() {
  const [presets, setPresets] = useState<string[]>(DEFAULT_TITLE_PRESETS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
            setPresets(parsed);
          }
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TITLE_PRESETS));
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: string[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const addPreset = useCallback(
    (title: string) => {
      const t = title.trim();
      if (!t) return;
      setPresets((prev) => {
        if (prev.includes(t)) return prev;
        const next = [...prev, t];
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removePreset = useCallback(
    (title: string) => {
      setPresets((prev) => {
        const next = prev.filter((p) => p !== title);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  return { presets, hydrated, addPreset, removePreset };
}
