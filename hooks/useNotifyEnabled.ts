import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'schedule-app:notify-enabled:v1';

export function useNotifyEnabled() {
  const [enabled, setEnabled] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (cancelled) return;
        if (raw === '0') setEnabled(false);
        else setEnabled(true);
      } catch {} finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback(async (next: boolean) => {
    setEnabled(next);
    try {
      await AsyncStorage.setItem(KEY, next ? '1' : '0');
    } catch {}
  }, []);

  return { enabled, hydrated, setEnabled: update };
}
