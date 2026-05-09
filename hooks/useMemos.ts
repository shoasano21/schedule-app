import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { SAMPLE_MEMOS } from '../constants/sampleMemos';
import type { Memo } from '../types/Memo';

const STORAGE_KEY = 'schedule-app:memos:v1';
const SEED_FLAG_KEY = 'schedule-app:memos-seeded:v1';

function makeId() {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useMemos() {
  const [memos, setMemos] = useState<Memo[]>([]);
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
          const parsed = JSON.parse(raw) as Memo[];
          if (Array.isArray(parsed)) setMemos(parsed);
        } else if (!seeded) {
          setMemos(SAMPLE_MEMOS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_MEMOS));
          await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
        }
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

  const persist = useCallback(async (next: Memo[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const createMemo = useCallback((): Memo => {
    const now = Date.now();
    const m: Memo = {
      id: makeId(),
      title: '',
      body: '',
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    setMemos((prev) => {
      const next = [m, ...prev];
      void persist(next);
      return next;
    });
    return m;
  }, [persist]);

  const updateMemo = useCallback(
    (id: string, patch: Partial<Omit<Memo, 'id' | 'createdAt'>>) => {
      setMemos((prev) => {
        const next = prev.map((m) =>
          m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
        );
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeMemo = useCallback(
    (id: string) => {
      setMemos((prev) => {
        const next = prev.filter((m) => m.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const insertMemos = useCallback(
    (incoming: Memo[]) => {
      if (incoming.length === 0) return;
      setMemos((prev) => {
        const next = [...incoming, ...prev];
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  // ピン留めを上、その後更新日時降順
  const sortedMemos = [...memos].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return {
    memos: sortedMemos,
    hydrated,
    createMemo,
    updateMemo,
    removeMemo,
    insertMemos,
  };
}
