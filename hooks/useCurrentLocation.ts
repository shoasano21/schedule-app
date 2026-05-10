import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

let Location: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Location = require('expo-location');
} catch {
  Location = null;
}

const CACHE_KEY = 'schedule-app:location-cache:v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 日

interface CachedCoord {
  lat: number;
  lng: number;
  fetchedAt: number;
}

/**
 * 端末の現在地を取得 (省電力: 7 日キャッシュ + 低精度)。
 * 不許可 / 取得失敗時は null を返す。呼び出し側が東京座標などにフォールバックする。
 */
export function useCurrentLocation(enabled: boolean) {
  const [coord, setCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<{ lat: number; lng: number } | null> => {
    setBusy(true);
    setError(null);
    try {
      // Web は navigator.geolocation
      if (Platform.OS === 'web') {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          setError('Web Geolocation API が使えません');
          return null;
        }
        return await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCoord(c);
              AsyncStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ ...c, fetchedAt: Date.now() } as CachedCoord)
              ).catch(() => {});
              resolve(c);
            },
            (err) => {
              setError(err.message ?? '位置情報の取得に失敗');
              resolve(null);
            },
            { maximumAge: CACHE_TTL_MS, timeout: 8000 }
          );
        });
      }

      // Native: expo-location
      if (!Location) {
        setError('expo-location が利用できません');
        return null;
      }
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setError('位置情報の使用が許可されていません');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCoord(c);
      try {
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ...c, fetchedAt: Date.now() } as CachedCoord)
        );
      } catch {}
      return c;
    } catch (e: any) {
      setError(e?.message ?? '位置情報の取得に失敗');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      // 先にキャッシュ
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as CachedCoord;
          if (
            typeof parsed?.lat === 'number' &&
            typeof parsed?.lng === 'number' &&
            Date.now() - parsed.fetchedAt < CACHE_TTL_MS
          ) {
            setCoord({ lat: parsed.lat, lng: parsed.lng });
            return;
          }
        }
      } catch {}
      if (!cancelled) await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, refresh]);

  return { coord, busy, error, refresh };
}
