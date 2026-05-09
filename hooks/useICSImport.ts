import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import type { EventItem } from '../types/Event';
import { icsToEvents, parseICS } from '../utils/icsImport';

export function useICSImport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const pickAndParse = useCallback(async (): Promise<Omit<EventItem, 'id'>[] | null> => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      let text = '';
      if (Platform.OS === 'web') {
        text = await pickFileWeb();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['text/calendar', 'text/plain', '*/*'],
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (result.canceled || !result.assets || result.assets.length === 0) {
          return null;
        }
        text = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
      const parsed = parseICS(text);
      if (parsed.length === 0) {
        setError('予定が見つかりませんでした (形式が違うか、空のファイルです)');
        return null;
      }
      return icsToEvents(parsed);
    } catch (e: any) {
      setError(e?.message ?? '読み込みに失敗しました');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    pickAndParse,
    busy,
    error,
    info,
    setInfo,
    clear: () => {
      setError(null);
      setInfo(null);
    },
  };
}

function pickFileWeb(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Web 環境ではありません'));
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ics,text/calendar';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('読み込み失敗'));
      reader.readAsText(file);
    };
    input.click();
  });
}
