import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

const BACKUP_KEYS = [
  'schedule-app:events:v1',
  'schedule-app:tasks:v1',
  'schedule-app:subjects:v1',
  'schedule-app:period-times:v1',
  'schedule-app:title-presets:v1',
  'schedule-app:memos:v1',
  'schedule-app:notify-enabled:v1',
  'schedule-app:notify-settings:v1',
  'schedule-app:preferences:v1',
];

const BACKUP_VERSION = 1;
const BACKUP_APP = 'cadence';

interface BackupPayload {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number;
  data: Record<string, unknown>;
}

export function useBackup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const exportBackup = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const entries = await AsyncStorage.multiGet(BACKUP_KEYS);
      const data: Record<string, unknown> = {};
      for (const [key, value] of entries) {
        if (value == null) continue;
        try {
          data[key] = JSON.parse(value);
        } catch {
          data[key] = value;
        }
      }
      const payload: BackupPayload = {
        app: BACKUP_APP,
        version: BACKUP_VERSION,
        exportedAt: Date.now(),
        data,
      };
      const json = JSON.stringify(payload, null, 2);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `cadence-backup-${dateStr}.json`;

      const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!dir) throw new Error('ファイルシステムが利用できません');
      const target = `${dir}${filename}`;
      await FileSystem.writeAsStringAsync(target, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

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
        setInfo('バックアップをダウンロードしました');
        return true;
      }

      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        setError('共有機能が利用できません');
        return false;
      }
      await Sharing.shareAsync(target, {
        mimeType: 'application/json',
        dialogTitle: 'Cadence のバックアップ',
        UTI: 'public.json',
      });
      setInfo('バックアップを書き出しました');
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'バックアップに失敗しました');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const importBackup = useCallback(async (): Promise<boolean> => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return false;
      }
      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(content) as Partial<BackupPayload>;
      if (parsed?.app !== BACKUP_APP) {
        setError('Cadence のバックアップファイルではありません');
        return false;
      }
      if (typeof parsed.version !== 'number' || parsed.version > BACKUP_VERSION) {
        setError('このバックアップは新しすぎる、または対応外のバージョンです');
        return false;
      }
      if (!parsed.data || typeof parsed.data !== 'object') {
        setError('バックアップデータが破損しています');
        return false;
      }

      const entries: [string, string][] = [];
      for (const key of BACKUP_KEYS) {
        const value = (parsed.data as Record<string, unknown>)[key];
        if (value == null) continue;
        try {
          entries.push([key, JSON.stringify(value)]);
        } catch {
          // skip unstringifiable
        }
      }
      if (entries.length === 0) {
        setError('読み込めるデータが含まれていません');
        return false;
      }
      await AsyncStorage.multiSet(entries);
      setInfo(`${entries.length}項目を復元しました。アプリを再起動してください`);
      return true;
    } catch (e: any) {
      setError(e?.message ?? '読み込みに失敗しました');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { exportBackup, importBackup, busy, error, info };
}
