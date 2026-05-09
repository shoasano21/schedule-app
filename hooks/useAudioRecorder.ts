import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

let Audio: any = null;
try {
  // expo-av は SDK 54 で deprecation 警告が出るが、まだ動作する
  // Web では import 自体が問題になる可能性があるため try/catch
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Audio = require('expo-av').Audio;
  }
} catch {
  Audio = null;
}

interface RecorderState {
  recording: boolean;
  durationSec: number;
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    recording: false,
    durationSec: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<any>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTimer(), []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!Audio) {
      setError('録音はこの環境では利用できません');
      return false;
    }
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        setError('マイクへのアクセスが許可されていません');
        return false;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      startedAtRef.current = Date.now();
      setState({ recording: true, durationSec: 0 });
      stopTimer();
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          durationSec: Math.floor((Date.now() - startedAtRef.current) / 1000),
        }));
      }, 250);
      return true;
    } catch (e: any) {
      setError(e?.message ?? '録音開始に失敗');
      return false;
    }
  }, []);

  const stop = useCallback(async (): Promise<{ uri: string; durationSec: number } | null> => {
    const rec = recordingRef.current;
    stopTimer();
    if (!rec) {
      setState({ recording: false, durationSec: 0 });
      return null;
    }
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      const durationSec = Math.max(1, Math.floor((Date.now() - startedAtRef.current) / 1000));
      recordingRef.current = null;
      setState({ recording: false, durationSec: 0 });
      if (!uri) return null;
      return { uri, durationSec };
    } catch (e: any) {
      setError(e?.message ?? '録音終了に失敗');
      recordingRef.current = null;
      setState({ recording: false, durationSec: 0 });
      return null;
    }
  }, []);

  const cancel = useCallback(async () => {
    const rec = recordingRef.current;
    stopTimer();
    if (rec) {
      try {
        await rec.stopAndUnloadAsync();
      } catch {}
    }
    recordingRef.current = null;
    setState({ recording: false, durationSec: 0 });
  }, []);

  return { state, error, start, stop, cancel, supported: !!Audio };
}
