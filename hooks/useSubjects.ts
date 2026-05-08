import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PERIOD_TIMES, NUM_PERIODS } from '../constants/taskTypes';
import type { PeriodTime, Subject } from '../types/Task';

const SUBJECTS_KEY = 'schedule-app:subjects:v1';
const PERIODS_KEY = 'schedule-app:period-times:v1';

function makeId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periodTimes, setPeriodTimes] = useState<Record<number, PeriodTime>>(
    () => JSON.parse(JSON.stringify(DEFAULT_PERIOD_TIMES))
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sRaw, pRaw] = await Promise.all([
          AsyncStorage.getItem(SUBJECTS_KEY),
          AsyncStorage.getItem(PERIODS_KEY),
        ]);
        if (cancelled) return;
        if (sRaw) {
          const parsed = JSON.parse(sRaw) as Subject[];
          if (Array.isArray(parsed)) setSubjects(parsed);
        }
        if (pRaw) {
          const parsed = JSON.parse(pRaw) as Record<number, PeriodTime>;
          if (parsed && typeof parsed === 'object') {
            const merged: Record<number, PeriodTime> = JSON.parse(JSON.stringify(DEFAULT_PERIOD_TIMES));
            for (let p = 1; p <= NUM_PERIODS; p++) {
              if (parsed[p] && parsed[p].start && parsed[p].end) merged[p] = parsed[p];
            }
            setPeriodTimes(merged);
          }
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

  const persistSubjects = useCallback(async (next: Subject[]) => {
    try {
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const persistPeriods = useCallback(async (next: Record<number, PeriodTime>) => {
    try {
      await AsyncStorage.setItem(PERIODS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const upsertSubject = useCallback(
    (input: Omit<Subject, 'id'> & { id?: string }) => {
      setSubjects((prev) => {
        let next: Subject[];
        if (input.id) {
          next = prev.map((s) => (s.id === input.id ? ({ ...s, ...input, id: input.id } as Subject) : s));
        } else {
          // ensure we don't duplicate at the same (day, period) — replace existing
          const filtered = prev.filter((s) => !(s.day === input.day && s.period === input.period));
          next = [...filtered, { ...input, id: makeId() }];
        }
        void persistSubjects(next);
        return next;
      });
    },
    [persistSubjects]
  );

  const removeSubject = useCallback(
    (id: string) => {
      setSubjects((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void persistSubjects(next);
        return next;
      });
    },
    [persistSubjects]
  );

  const updatePeriodTime = useCallback(
    (period: number, value: PeriodTime) => {
      setPeriodTimes((prev) => {
        const next = { ...prev, [period]: value };
        void persistPeriods(next);
        return next;
      });
    },
    [persistPeriods]
  );

  const resetPeriodTime = useCallback(
    (period: number) => {
      const def = DEFAULT_PERIOD_TIMES[period];
      if (!def) return;
      updatePeriodTime(period, def);
    },
    [updatePeriodTime]
  );

  const subjectsByCell = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of subjects) m.set(`${s.day}-${s.period}`, s);
    return m;
  }, [subjects]);

  const subjectByName = useCallback(
    (name: string) => {
      if (!name) return undefined;
      return subjects.find((s) => s.name === name);
    },
    [subjects]
  );

  const subjectNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of subjects) if (s.name) set.add(s.name);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [subjects]);

  return {
    subjects,
    periodTimes,
    hydrated,
    subjectsByCell,
    subjectByName,
    subjectNames,
    upsertSubject,
    removeSubject,
    updatePeriodTime,
    resetPeriodTime,
  };
}
