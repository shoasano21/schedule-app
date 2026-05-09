import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { EventItem } from '../types/Event';
import { fromISODate, toISODate } from '../utils/date';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const ID_PREFIX = 'tomorrow-prep-';

async function cancelAll() {
  if (!supported) return;
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      list
        .filter((n) => (n.identifier || '').startsWith(ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {}
}

/**
 * 「明日の予定」通知を 7 日先まで毎日スケジュール (内容は静的なので "明日 N 件" に統一)。
 * 詳細はアプリ起動時に最新を再計算するため、本通知はリマインダーとして機能する。
 */
async function syncTomorrowPrep(events: EventItem[], time: string | null, enabled: boolean) {
  if (!supported) return;
  await cancelAll();
  if (!enabled || !time) return;
  const [hStr, mStr] = time.split(':');
  const hour = Math.min(23, Math.max(0, Number(hStr) || 21));
  const minute = Math.min(59, Math.max(0, Number(mStr) || 0));

  const now = Date.now();
  for (let i = 0; i < 7; i++) {
    const fireDate = new Date();
    fireDate.setDate(fireDate.getDate() + i);
    fireDate.setHours(hour, minute, 0, 0);
    if (fireDate.getTime() <= now) continue;

    const tomorrow = new Date(fireDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowISO = toISODate(tomorrow);

    const tomorrowEvents = events
      .filter((e) => e.date === tomorrowISO)
      .sort((a, b) => a.startH - b.startH);

    if (tomorrowEvents.length === 0) continue;

    const top = tomorrowEvents
      .slice(0, 3)
      .map((e) => `${String(e.startH).padStart(2, '0')}:00 ${e.title}`)
      .join(' / ');
    const more =
      tomorrowEvents.length > 3 ? ` 他 ${tomorrowEvents.length - 3} 件` : '';

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${tomorrowISO}`,
        content: {
          title: `📅 明日は ${tomorrowEvents.length} 件の予定`,
          body: `${top}${more}`,
        },
        trigger: { type: 'date', date: fireDate } as any,
      });
    } catch {
      // ignore individual failures
    }
  }
}

/**
 * 繰り返しイベントを含めた「明日の予定」を毎日リマインドする。
 */
export function useTomorrowPrepNotifications(
  events: EventItem[],
  time: string | null,
  enabled: boolean
) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await syncTomorrowPrep(events, time, enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, [events, time, enabled]);
}
