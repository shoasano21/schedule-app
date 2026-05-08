import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { TIMETABLE_DAYS } from '../constants/taskTypes';
import type { PeriodTime, Subject } from '../types/Task';
import { ensureNotificationPermission } from './useTaskNotifications';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

const HORIZON_DAYS = 14;

async function cancelClassNotifications() {
  if (!supported) return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => {
          const id = n.identifier || '';
          return id.startsWith('class-start-') || id.startsWith('class-end-');
        })
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // ignore
  }
}

function ymdLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function syncClassNotifications(
  subjects: Subject[],
  periodTimes: Record<number, PeriodTime>,
  startLead: number,
  endLead: number,
  enabled: boolean
) {
  if (!supported) return;
  await cancelClassNotifications();
  if (!enabled) return;
  if (subjects.length === 0) return;
  if (startLead < 0 && endLead < 0) return;

  const now = new Date();
  for (let offset = 0; offset <= HORIZON_DAYS; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const dow = day.getDay();
    if (!TIMETABLE_DAYS.includes(dow as 1 | 2 | 3 | 4 | 5)) continue;

    const todays = subjects.filter((s) => s.day === dow);
    for (const s of todays) {
      const pt = periodTimes[s.period];
      if (!pt) continue;
      const ymd = ymdLocal(day);

      if (startLead >= 0 && pt.start) {
        const [sh, sm] = pt.start.split(':').map(Number);
        const startWhen = new Date(day);
        startWhen.setHours(sh || 0, sm || 0, 0, 0);
        startWhen.setMinutes(startWhen.getMinutes() - startLead);
        if (startWhen.getTime() > now.getTime()) {
          try {
            await Notifications.scheduleNotificationAsync({
              identifier: `class-start-${s.id}-${ymd}`,
              content: {
                title:
                  startLead === 0
                    ? `🎓 ${s.period}限 ${s.name}`
                    : `🎓 ${startLead}分後 ${s.name}`,
                body: `${pt.start} 〜 ${pt.end}`,
              },
              trigger: { type: 'date', date: startWhen } as any,
            });
          } catch {
            // ignore
          }
        }
      }

      if (endLead >= 0 && pt.end) {
        const [eh, em] = pt.end.split(':').map(Number);
        const endWhen = new Date(day);
        endWhen.setHours(eh || 0, em || 0, 0, 0);
        endWhen.setMinutes(endWhen.getMinutes() - endLead);
        if (endWhen.getTime() > now.getTime()) {
          try {
            await Notifications.scheduleNotificationAsync({
              identifier: `class-end-${s.id}-${ymd}`,
              content: {
                title: `📝 ${s.name} 課題は？`,
                body: `授業終了が近づきました。出題された課題を登録しましょう`,
              },
              trigger: { type: 'date', date: endWhen } as any,
            });
          } catch {
            // ignore
          }
        }
      }
    }
  }
}

export function useClassNotifications(
  subjects: Subject[],
  periodTimes: Record<number, PeriodTime>,
  startLead: number,
  endLead: number,
  enabled: boolean
) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported) return;
      const wantsAny = enabled && (startLead >= 0 || endLead >= 0);
      if (wantsAny) {
        const ok = await ensureNotificationPermission();
        if (cancelled || !ok) return;
        await syncClassNotifications(subjects, periodTimes, startLead, endLead, true);
      } else {
        await cancelClassNotifications();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjects, periodTimes, startLead, endLead, enabled]);
}
