import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SAMPLE_EVENTS } from '../constants/initialData';
import type { EventItem } from '../types/Event';
import { fromISODate, toISODate } from '../utils/date';

const STORAGE_KEY = 'schedule-app:events:v1';
const SEED_FLAG_KEY = 'schedule-app:seeded:v1';

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** baseId::YYYY-MM-DD 形式の virtual id を解決して元の id を返す */
export function resolveBaseId(id: string): string {
  const idx = id.indexOf('::');
  return idx === -1 ? id : id.slice(0, idx);
}

/** 繰り返しイベントを実体インスタンスに展開する。範囲: 過去6ヶ月 〜 未来2年 */
function expandRecurring(events: EventItem[]): EventItem[] {
  const out: EventItem[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const earliest = new Date(now);
  earliest.setMonth(earliest.getMonth() - 6);
  const latest = new Date(now);
  latest.setFullYear(latest.getFullYear() + 2);

  for (const ev of events) {
    if (!ev.repeat) {
      out.push(ev);
      continue;
    }
    const base = fromISODate(ev.date);
    const until = ev.repeat.until ? fromISODate(ev.repeat.until) : latest;
    const stop = until.getTime() < latest.getTime() ? until : latest;

    const cur = new Date(base);
    let safety = 0;
    while (cur.getTime() <= stop.getTime() && safety < 1000) {
      safety += 1;
      if (cur.getTime() >= earliest.getTime()) {
        const iso = toISODate(cur);
        out.push({
          ...ev,
          id: `${ev.id}::${iso}`,
          date: iso,
          baseId: ev.id,
        });
      }
      if (ev.repeat.freq === 'daily') {
        cur.setDate(cur.getDate() + 1);
      } else if (ev.repeat.freq === 'weekly') {
        cur.setDate(cur.getDate() + 7);
      } else if (ev.repeat.freq === 'monthly') {
        cur.setMonth(cur.getMonth() + 1);
      } else {
        break;
      }
    }
  }
  return out;
}

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [eventsRaw, seeded] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(SEED_FLAG_KEY),
        ]);
        if (cancelled) return;
        if (eventsRaw) {
          const parsed = JSON.parse(eventsRaw) as EventItem[];
          setEvents(Array.isArray(parsed) ? parsed : []);
        } else if (!seeded) {
          setEvents(SAMPLE_EVENTS);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_EVENTS));
          await AsyncStorage.setItem(SEED_FLAG_KEY, '1');
        }
      } catch {
        // ignore — start with empty state
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: EventItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best-effort write; the in-memory state stays correct for this session.
    }
  }, []);

  const addEvent = useCallback(
    (input: Omit<EventItem, 'id'>): EventItem => {
      const item: EventItem = { ...input, id: makeId() };
      setEvents((prev) => {
        const next = [...prev, item];
        void persist(next);
        return next;
      });
      return item;
    },
    [persist]
  );

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<EventItem, 'id'>>) => {
      const realId = resolveBaseId(id);
      setEvents((prev) => {
        const next = prev.map((e) => (e.id === realId ? { ...e, ...patch } : e));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeEvent = useCallback(
    (id: string) => {
      const realId = resolveBaseId(id);
      setEvents((prev) => {
        const next = prev.filter((e) => e.id !== realId);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  // 繰り返しを展開した上で日付ごとに分類
  const expandedEvents = useMemo(() => expandRecurring(events), [events]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of expandedEvents) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startH - b.startH);
    }
    return map;
  }, [expandedEvents]);

  const getForDate = useCallback(
    (date: string) => eventsByDate.get(date) ?? [],
    [eventsByDate]
  );

  const datesWithEvents = useMemo(() => new Set(eventsByDate.keys()), [eventsByDate]);

  return {
    events,
    eventsByDate,
    datesWithEvents,
    getForDate,
    hydrated,
    addEvent,
    updateEvent,
    removeEvent,
  };
}
