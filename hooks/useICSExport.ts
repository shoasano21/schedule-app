import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { EventItem } from '../types/Event';
import { buildICS } from '../utils/ics';

export function useICSExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportICS = useCallback(async (events: EventItem[], filename = 'cadence.ics') => {
    if (events.length === 0) {
      setError('書き出す予定がありません');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const ics = buildICS(events);
      const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
      if (!dir) throw new Error('ファイルシステムが利用できません');
      const target = `${dir}${filename}`;
      await FileSystem.writeAsStringAsync(target, ics, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (Platform.OS === 'web') {
        // Web fallback: open as data URL (browser will download)
        const data = `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
        if (typeof window !== 'undefined') {
          const a = document.createElement('a');
          a.href = data;
          a.download = filename;
          a.click();
        }
        return true;
      }

      const ok = await Sharing.isAvailableAsync();
      if (!ok) {
        setError('共有機能が利用できません');
        return false;
      }
      await Sharing.shareAsync(target, {
        mimeType: 'text/calendar',
        dialogTitle: 'Cadence カレンダーを書き出す',
        UTI: 'com.apple.ical.ics',
      });
      return true;
    } catch (e: any) {
      setError(e?.message ?? '書き出しに失敗しました');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { exportICS, busy, error };
}
