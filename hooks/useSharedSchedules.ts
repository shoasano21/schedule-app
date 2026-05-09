import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { EventItem } from '../types/Event';
import {
  SCHEDULE_SHARE_VERSION,
  type ScheduleShareFile,
  type SharedSchedule,
} from '../types/SharedSchedule';

const STORAGE_KEY = 'schedule-app:shared-schedules:v1';
const SHARE_NAME_KEY = 'schedule-app:share-name:v1';

function makeId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileName(s: string) {
  return (s || 'schedule').replace(/[^\w一-龯ぁ-んァ-ヶー\-]/g, '_').slice(0, 24) || 'schedule';
}

export function useSharedSchedules() {
  const [schedules, setSchedules] = useState<SharedSchedule[]>([]);
  const [shareName, setShareName] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [raw, name] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SHARE_NAME_KEY),
        ]);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as SharedSchedule[];
          if (Array.isArray(parsed)) setSchedules(parsed);
        }
        if (name) setShareName(name);
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

  const persist = useCallback(async (next: SharedSchedule[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
  }, []);

  const persistName = useCallback(async (name: string) => {
    try {
      await AsyncStorage.setItem(SHARE_NAME_KEY, name);
    } catch {
      // best-effort
    }
  }, []);

  const updateShareName = useCallback(
    (name: string) => {
      const trimmed = name.trim().slice(0, 24);
      setShareName(trimmed);
      void persistName(trimmed);
    },
    [persistName]
  );

  const removeSchedule = useCallback(
    (id: string) => {
      setSchedules((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const exportSchedule = useCallback(
    async (events: EventItem[], name: string): Promise<boolean> => {
      const trimmedName = name.trim() || '無名';
      setBusy(true);
      setError(null);
      setInfo(null);
      try {
        if (events.length === 0) {
          setError('共有できる予定がありません');
          return false;
        }
        updateShareName(trimmedName);
        const payload: ScheduleShareFile = {
          app: 'cadence',
          type: 'schedule-share',
          version: SCHEDULE_SHARE_VERSION,
          name: trimmedName,
          generatedAt: Date.now(),
          events,
        };
        const json = JSON.stringify(payload);
        const filename = `cadence-schedule-${sanitizeFileName(trimmedName)}.json`;

        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') {
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
          }
          setInfo('スケジュールをダウンロードしました');
          return true;
        }

        const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
        if (!dir) throw new Error('ファイルシステムが利用できません');
        const target = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(target, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const ok = await Sharing.isAvailableAsync();
        if (!ok) {
          setError('共有機能が利用できません');
          return false;
        }
        await Sharing.shareAsync(target, {
          mimeType: 'application/json',
          dialogTitle: 'Cadence スケジュールを共有',
          UTI: 'public.json',
        });
        setInfo('スケジュールを共有しました');
        return true;
      } catch (e: any) {
        setError(e?.message ?? '共有に失敗しました');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [updateShareName]
  );

  const importSchedule = useCallback(async (): Promise<SharedSchedule | null> => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return null;
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(content) as Partial<ScheduleShareFile>;
      if (parsed?.app !== 'cadence' || parsed?.type !== 'schedule-share') {
        setError('Cadence の共有ファイルではありません');
        return null;
      }
      if (typeof parsed.version !== 'number' || parsed.version > SCHEDULE_SHARE_VERSION) {
        setError('このファイルは新しすぎる、または対応外のバージョンです');
        return null;
      }
      if (!Array.isArray(parsed.events)) {
        setError('予定データが破損しています');
        return null;
      }

      const incoming: SharedSchedule = {
        id: makeId(),
        name: (parsed.name ?? '名無し').trim().slice(0, 24) || '名無し',
        generatedAt: parsed.generatedAt ?? Date.now(),
        importedAt: Date.now(),
        events: parsed.events.filter(
          (e: any) =>
            e &&
            typeof e.id === 'string' &&
            typeof e.title === 'string' &&
            typeof e.date === 'string' &&
            typeof e.startH === 'number' &&
            typeof e.endH === 'number'
        ) as EventItem[],
      };

      setSchedules((prev) => {
        const next = [incoming, ...prev];
        void persist(next);
        return next;
      });
      setInfo(`${incoming.name} さんのスケジュールを取り込みました`);
      return incoming;
    } catch (e: any) {
      setError(e?.message ?? '読み込みに失敗しました');
      return null;
    } finally {
      setBusy(false);
    }
  }, [persist]);

  return {
    schedules,
    shareName,
    hydrated,
    busy,
    error,
    info,
    exportSchedule,
    importSchedule,
    removeSchedule,
    setShareName: updateShareName,
    clearMessages: () => {
      setError(null);
      setInfo(null);
    },
  };
}
