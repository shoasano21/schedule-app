import { useEffect } from 'react';
import { Platform } from 'react-native';
// @ts-ignore - no TypeScript types ship with this library
import SharedGroupPreferences from 'react-native-shared-group-preferences';
import type { EventItem } from '../types/Event';
import { toISODate } from '../utils/date';

const APP_GROUP_ID = 'group.com.shoasano.scheduleapp';
const STORAGE_KEY = 'widget_data';

interface BriefEvent {
  id: string;
  title: string;
  startH: number;
  endH: number;
  color: string;
  location?: string;
}

interface WidgetPayload {
  syncedAt: number;
  events: BriefEvent[];
}

async function writePayload(payload: WidgetPayload): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    await SharedGroupPreferences.setItem(STORAGE_KEY, JSON.stringify(payload), APP_GROUP_ID);
  } catch {
    // best-effort — widget will use stale data
  }
}

export function useWidgetSync(events: EventItem[], hydrated: boolean) {
  useEffect(() => {
    if (!hydrated) return;
    if (Platform.OS !== 'ios') return;
    const todayISO = toISODate(new Date());
    const today = events
      .filter((e) => e.date === todayISO)
      .sort((a, b) => a.startH - b.startH)
      .map<BriefEvent>((e) => ({
        id: e.id,
        title: e.title,
        startH: e.startH,
        endH: e.endH,
        color: e.color,
        location: e.location || undefined,
      }));
    void writePayload({ syncedAt: Date.now() / 1000, events: today });
  }, [events, hydrated]);
}
