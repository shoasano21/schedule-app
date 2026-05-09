import AsyncStorage from '@react-native-async-storage/async-storage';
import LZString from 'lz-string';
import { useCallback, useEffect, useState } from 'react';
import type { ColorId, EventItem } from '../types/Event';
import {
  SCHEDULE_SHARE_VERSION,
  type SharedSchedule,
} from '../types/SharedSchedule';

const STORAGE_KEY = 'schedule-app:shared-schedules:v1';
const SHARE_NAME_KEY = 'schedule-app:share-name:v1';

// QR コードに詰めるためのスリムフォーマット
interface SlimEvent {
  i: string;
  t: string;
  d: string;
  s: number;
  h: number;
  c: ColorId;
  l?: string;
  m?: string;
}
interface SlimPayload {
  a: 'cad';
  v: number;
  n: string;
  g: number;
  e: SlimEvent[];
}

function toSlim(events: EventItem[], name: string): SlimPayload {
  return {
    a: 'cad',
    v: SCHEDULE_SHARE_VERSION,
    n: name,
    g: Date.now(),
    e: events.map((ev) => {
      const o: SlimEvent = {
        i: ev.id,
        t: ev.title,
        d: ev.date,
        s: ev.startH,
        h: ev.endH,
        c: ev.color,
      };
      if (ev.location) o.l = ev.location;
      if (ev.memo) o.m = ev.memo;
      return o;
    }),
  };
}

function fromSlim(p: Partial<SlimPayload>): { name: string; generatedAt: number; events: EventItem[] } | null {
  if (p?.a !== 'cad' || !Array.isArray(p.e)) return null;
  if (typeof p.v !== 'number' || p.v > SCHEDULE_SHARE_VERSION) return null;
  const events: EventItem[] = [];
  for (const ev of p.e) {
    if (
      ev &&
      typeof ev.i === 'string' &&
      typeof ev.t === 'string' &&
      typeof ev.d === 'string' &&
      typeof ev.s === 'number' &&
      typeof ev.h === 'number' &&
      typeof ev.c === 'string'
    ) {
      events.push({
        id: ev.i,
        title: ev.t,
        date: ev.d,
        startH: ev.s,
        endH: ev.h,
        color: ev.c as ColorId,
        location: ev.l ?? '',
        memo: ev.m ?? '',
      });
    }
  }
  return {
    name: (p.n ?? '名無し').trim().slice(0, 24) || '名無し',
    generatedAt: p.g ?? Date.now(),
    events,
  };
}

export function encodeForQR(events: EventItem[], name: string): string {
  const payload = toSlim(events, name);
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function decodeFromQR(text: string): { name: string; generatedAt: number; events: EventItem[] } | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(text);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<SlimPayload>;
    return fromSlim(parsed);
  } catch {
    return null;
  }
}

function makeId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
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

  // QR コード用の圧縮ペイロード生成 (共有時に名前を保存)
  const prepareQRPayload = useCallback(
    (events: EventItem[], name: string): { qr: string | null; tooLarge: boolean } => {
      const trimmedName = name.trim() || '無名';
      setError(null);
      setInfo(null);
      if (events.length === 0) {
        setError('共有できる予定がありません');
        return { qr: null, tooLarge: false };
      }
      updateShareName(trimmedName);
      const qr = encodeForQR(events, trimmedName);
      // QR Code v40 の最大データ量 (alphanumeric ~4296 文字、エラー訂正 L で)
      const tooLarge = qr.length > 2900;
      return { qr, tooLarge };
    },
    [updateShareName]
  );

  // QR (もしくは手入力) で取り込み
  const ingestQRPayload = useCallback(
    (text: string): SharedSchedule | null => {
      setError(null);
      setInfo(null);
      const decoded = decodeFromQR(text);
      if (!decoded) {
        setError('Cadence の共有データではありません');
        return null;
      }
      const incoming: SharedSchedule = {
        id: makeId(),
        name: decoded.name,
        generatedAt: decoded.generatedAt,
        importedAt: Date.now(),
        events: decoded.events,
      };
      setSchedules((prev) => {
        const next = [incoming, ...prev];
        void persist(next);
        return next;
      });
      setInfo(`${incoming.name} さんのスケジュールを取り込みました`);
      return incoming;
    },
    [persist]
  );

  return {
    schedules,
    shareName,
    hydrated,
    busy,
    error,
    info,
    prepareQRPayload,
    ingestQRPayload,
    removeSchedule,
    setShareName: updateShareName,
    clearMessages: () => {
      setError(null);
      setInfo(null);
    },
  };
}
