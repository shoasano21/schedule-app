import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const CACHE_KEY = 'schedule-app:weather-cache:v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 時間

export type WeatherCode =
  | 'sun'
  | 'cloud'
  | 'rain'
  | 'thunder'
  | 'snow'
  | 'fog'
  | 'unknown';

export interface DailyWeather {
  date: string; // YYYY-MM-DD
  code: WeatherCode;
  tMax: number;
  tMin: number;
  precip: number;
}

interface CachedWeather {
  fetchedAt: number;
  lat: number;
  lng: number;
  daily: DailyWeather[];
}

// Open-Meteo の WMO コードを大まかなアイコン区分にマップ
function classify(wmo: number): WeatherCode {
  if (wmo === 0) return 'sun';
  if (wmo >= 1 && wmo <= 3) return 'cloud';
  if (wmo === 45 || wmo === 48) return 'fog';
  if ((wmo >= 51 && wmo <= 67) || (wmo >= 80 && wmo <= 82)) return 'rain';
  if ((wmo >= 71 && wmo <= 77) || wmo === 85 || wmo === 86) return 'snow';
  if (wmo >= 95 && wmo <= 99) return 'thunder';
  return 'unknown';
}

const TOKYO_LAT = 35.6895;
const TOKYO_LNG = 139.6917;

async function fetchOpenMeteo(lat: number, lng: number): Promise<DailyWeather[]> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Asia%2FTokyo&forecast_days=14`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo: HTTP ${res.status}`);
  const json = await res.json();
  const days: string[] = json?.daily?.time ?? [];
  const codes: number[] = json?.daily?.weather_code ?? [];
  const tmaxes: number[] = json?.daily?.temperature_2m_max ?? [];
  const tmins: number[] = json?.daily?.temperature_2m_min ?? [];
  const precips: number[] = json?.daily?.precipitation_probability_max ?? [];
  const out: DailyWeather[] = [];
  for (let i = 0; i < days.length; i++) {
    out.push({
      date: days[i],
      code: classify(codes[i] ?? -1),
      tMax: typeof tmaxes[i] === 'number' ? Math.round(tmaxes[i]) : NaN,
      tMin: typeof tmins[i] === 'number' ? Math.round(tmins[i]) : NaN,
      precip: typeof precips[i] === 'number' ? precips[i] : 0,
    });
  }
  return out;
}

export function useWeather(enabled: boolean) {
  const [byDate, setByDate] = useState<Map<string, DailyWeather>>(new Map());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const daily = await fetchOpenMeteo(TOKYO_LAT, TOKYO_LNG);
      const map = new Map<string, DailyWeather>();
      for (const d of daily) map.set(d.date, d);
      setByDate(map);
      const cached: CachedWeather = {
        fetchedAt: Date.now(),
        lat: TOKYO_LAT,
        lng: TOKYO_LNG,
        daily,
      };
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
      } catch {}
    } catch (e: any) {
      setError(e?.message ?? '天気の取得に失敗');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setByDate(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as CachedWeather;
          if (
            parsed?.daily &&
            Date.now() - parsed.fetchedAt < CACHE_TTL_MS &&
            !cancelled
          ) {
            const m = new Map<string, DailyWeather>();
            for (const d of parsed.daily) m.set(d.date, d);
            setByDate(m);
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

  return { byDate, busy, error, refresh };
}

export function weatherEmoji(code: WeatherCode): string {
  switch (code) {
    case 'sun':
      return '☀️';
    case 'cloud':
      return '☁️';
    case 'rain':
      return '☔';
    case 'thunder':
      return '⛈';
    case 'snow':
      return '❄️';
    case 'fog':
      return '🌫';
    default:
      return '';
  }
}
