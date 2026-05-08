import { useMemo } from 'react';
import type { Task } from '../types/Task';
import { daysLeft, statusOf } from '../utils/task';

export interface ReminderItem {
  task: Task;
  daysLeft: number;
  status: 'past' | 'urgent' | 'soon';
}

export function useReminders(tasks: Task[]): ReminderItem[] {
  return useMemo(() => {
    const items: ReminderItem[] = [];
    for (const t of tasks) {
      if (t.done) continue;
      if (t.remindDays < 0) continue;
      const left = daysLeft(t);
      const status = statusOf(t);
      if (status === 'past') {
        items.push({ task: t, daysLeft: left, status: 'past' });
      } else if (left <= t.remindDays) {
        items.push({ task: t, daysLeft: left, status: status === 'urgent' ? 'urgent' : 'soon' });
      }
    }
    items.sort((a, b) => a.daysLeft - b.daysLeft);
    return items;
  }, [tasks]);
}
