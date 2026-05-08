import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SAMPLE_TASKS } from '../constants/sampleTasks';
import type { Task } from '../types/Task';

const STORAGE_KEY = 'schedule-app:tasks:v1';
const SEED_FLAG_KEY = 'schedule-app:tasks-seeded:v1';

function makeId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [raw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEED_FLAG_KEY),
        ]);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Task[];
          setTasks(Array.isArray(parsed) ? parsed : []);
        } else if (!seeded) {
          setTasks(SAMPLE_TASKS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_TASKS));
          await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
        }
      } catch {
        // start with empty list on parse error
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: Task[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const addTask = useCallback(
    (input: Omit<Task, 'id'>): Task => {
      const t: Task = { ...input, id: makeId() };
      setTasks((prev) => {
        const next = [...prev, t];
        void persist(next);
        return next;
      });
      return t;
    },
    [persist]
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<Task, 'id'>>) => {
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const next = prev.filter((t) => t.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const toggleDone = useCallback(
    (id: string) => {
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const courses = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.course) set.add(t.course);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [tasks]);

  return {
    tasks,
    hydrated,
    courses,
    addTask,
    updateTask,
    removeTask,
    toggleDone,
  };
}
