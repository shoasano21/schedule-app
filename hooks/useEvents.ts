import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SAMPLE_EVENTS } from '../constants/initialData';
import type { EventItem } from '../types/Event';

const STORAGE_KEY = 'schedule-app:events:v1';
const SEED_FLAG_KEY = 'schedule-app:seeded:v1';

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
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
      setEvents((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeEvent = useCallback(
    (id: string) => {
      setEvents((prev) => {
        const next = prev.filter((e) => e.id !== id);
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startH - b.startH);
    }
    return map;
  }, [events]);

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
