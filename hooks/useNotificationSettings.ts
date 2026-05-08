import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const KEY = 'schedule-app:notify-settings:v1';

export interface NotificationSettings {
  taskTime: string; // 'HH:MM' for the daily task reminder time
  classStartLead: number; // minutes before class start; -1 = off
  classEndLead: number; // minutes before class end (= prompt to register tasks); -1 = off
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  taskTime: '09:00',
  classStartLead: -1,
  classEndLead: -1,
};

const TIME_RE = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function sanitize(raw: any): NotificationSettings {
  const out = { ...DEFAULT_NOTIFICATION_SETTINGS };
  if (raw && typeof raw === 'object') {
    if (typeof raw.taskTime === 'string' && TIME_RE.test(raw.taskTime)) out.taskTime = raw.taskTime;
    if (typeof raw.classStartLead === 'number') out.classStartLead = raw.classStartLead;
    if (typeof raw.classEndLead === 'number') out.classEndLead = raw.classEndLead;
  }
  return out;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (cancelled) return;
        if (raw) setSettings(sanitize(JSON.parse(raw)));
      } catch {
        // ignore
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const update = useCallback(
    (patch: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  return { settings, hydrated, update };
}
