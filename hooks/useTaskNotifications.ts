import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { TASK_TYPES } from '../constants/taskTypes';
import type { Task } from '../types/Task';
import { fromISODate } from '../utils/date';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted) return true;
    const next = await Notifications.requestPermissionsAsync();
    return !!next.granted;
  } catch {
    return false;
  }
}

async function cancelByPrefix(prefix: string) {
  if (!supported) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => (n.identifier || '').startsWith(prefix))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
}

export async function disableTaskNotifications() {
  await cancelByPrefix('task-');
}

export async function syncTaskNotifications(
  tasks: Task[],
  enabled: boolean,
  notifyTime: string = '09:00'
) {
  if (!supported) return;
  await cancelByPrefix('task-');
  if (!enabled) return;
  const [hStr, mStr] = notifyTime.split(':');
  const hour = Math.min(23, Math.max(0, Number(hStr) || 9));
  const minute = Math.min(59, Math.max(0, Number(mStr) || 0));
  const now = Date.now();
  for (const t of tasks) {
    if (t.done) continue;
    if (t.remindDays < 0) continue;
    const end = fromISODate(t.end);
    const offsets: number[] = [];
    if (t.remindDays >= 7) offsets.push(7);
    if (t.remindDays >= 3) offsets.push(3);
    if (t.remindDays >= 1) offsets.push(1);
    offsets.push(0);
    for (const off of offsets) {
      const when = new Date(end);
      when.setDate(when.getDate() - off);
      when.setHours(hour, minute, 0, 0);
      if (when.getTime() <= now) continue;
      const meta = TASK_TYPES[t.type];
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: `task-${t.id}-${off}`,
          content: {
            title:
              off === 0
                ? `${meta.emoji} 今日が締切: ${t.title}`
                : off === 1
                ? `${meta.emoji} 明日が締切: ${t.title}`
                : `${meta.emoji} あと${off}日: ${t.title}`,
            body: `${t.course} — ${meta.label}`,
          },
          trigger: { type: 'date', date: when } as any,
        });
      } catch {
        // ignore individual schedule failures
      }
    }
  }
}

export function useTaskNotifications(tasks: Task[], enabled: boolean, notifyTime: string = '09:00') {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) return;
      if (enabled) {
        const ok = await ensureNotificationPermission();
        if (cancelled || !ok) return;
        await syncTaskNotifications(tasks, true, notifyTime);
      } else {
        await disableTaskNotifications();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tasks, enabled, notifyTime]);
}
