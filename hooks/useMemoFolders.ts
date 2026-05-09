import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { MemoFolder } from '../types/Memo';

const STORAGE_KEY = 'schedule-app:memo-folders:v1';

const FOLDER_COLORS = ['#0a84ff', '#30b0c7', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#ff2d55', '#5856d6'];

function makeId() {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useMemoFolders() {
  const [folders, setFolders] = useState<MemoFolder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as MemoFolder[];
          if (Array.isArray(parsed)) setFolders(parsed);
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

  const persist = useCallback(async (next: MemoFolder[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const createFolder = useCallback(
    (name: string): MemoFolder | null => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      const f: MemoFolder = {
        id: makeId(),
        name: trimmed.slice(0, 24),
        color: FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)],
        createdAt: Date.now(),
      };
      setFolders((prev) => {
        const next = [...prev, f];
        void persist(next);
        return next;
      });
      return f;
    },
    [persist]
  );

  const renameFolder = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setFolders((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, name: trimmed.slice(0, 24) } : f));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeFolder = useCallback(
    (id: string) => {
      setFolders((prev) => {
        const next = prev.filter((f) => f.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  return {
    folders,
    hydrated,
    createFolder,
    renameFolder,
    removeFolder,
  };
}
