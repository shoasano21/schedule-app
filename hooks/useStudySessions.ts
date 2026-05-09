import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StudySession } from '../types/StudySession';

const STORAGE_KEY = 'schedule-app:study-sessions:v1';

function makeId() {
  return `ss-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isoOf(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useStudySessions() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled || !raw) return;
        try {
          const parsed = JSON.parse(raw) as StudySession[];
          if (Array.isArray(parsed)) setSessions(parsed);
        } catch {}
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: StudySession[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addSession = useCallback(
    (s: Omit<StudySession, 'id'>) => {
      const item: StudySession = { ...s, id: makeId() };
      setSessions((prev) => {
        const next = [item, ...prev];
        void persist(next);
        return next;
      });
      return item;
    },
    [persist]
  );

  const removeSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const stats = useMemo(() => {
    const todayISO = isoOf(Date.now());
    let todaySec = 0;
    let weekSec = 0;
    let monthSec = 0;
    const weekAgo = Date.now() - 7 * 86_400_000;
    const monthAgo = Date.now() - 30 * 86_400_000;

    const byTitle = new Map<string, number>();
    const dayBuckets = new Map<string, number>();

    for (const s of sessions) {
      const day = isoOf(s.startedAt);
      dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + s.durationSec);
      if (day === todayISO) todaySec += s.durationSec;
      if (s.startedAt >= weekAgo) weekSec += s.durationSec;
      if (s.startedAt >= monthAgo) monthSec += s.durationSec;
      const key = s.eventTitle?.trim() || '(無タイトル)';
      byTitle.set(key, (byTitle.get(key) ?? 0) + s.durationSec);
    }

    // ストリーク (連続日数: ≥ 5 分の日)
    let streak = 0;
    const cur = new Date();
    cur.setHours(0, 0, 0, 0);
    while (true) {
      const iso = isoOf(cur.getTime());
      const sec = dayBuckets.get(iso) ?? 0;
      if (sec >= 300) {
        streak += 1;
        cur.setDate(cur.getDate() - 1);
      } else {
        break;
      }
    }

    const topTitles = Array.from(byTitle.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 直近 7 日間
    const weekDays: { iso: string; sec: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const iso = isoOf(d.getTime());
      weekDays.push({ iso, sec: dayBuckets.get(iso) ?? 0 });
    }

    return {
      todaySec,
      weekSec,
      monthSec,
      streak,
      topTitles,
      weekDays,
      totalSessions: sessions.length,
    };
  }, [sessions]);

  return { sessions, hydrated, addSession, removeSession, stats };
}
