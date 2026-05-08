import type { Task, TaskStatus } from '../types/Task';
import { fromISODate, toISODate } from './date';

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysBetween(a: Date, b: Date): number {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bd - ad) / DAY_MS);
}

export function daysLeft(task: Task): number {
  return daysBetween(fromISODate(todayISO()), fromISODate(task.end));
}

export function statusOf(task: Task): TaskStatus {
  if (task.done) return 'done';
  const left = daysLeft(task);
  if (left < 0) return 'past';
  if (left <= 3) return 'urgent';
  if (left <= 7) return 'soon';
  return 'ok';
}

export function sortedByDeadline(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.end.localeCompare(b.end);
  });
}

export function statusBadge(status: TaskStatus, daysLeftValue: number): string {
  if (status === 'done') return '完了';
  if (status === 'past') return `${Math.abs(daysLeftValue)}日経過`;
  if (status === 'urgent') {
    if (daysLeftValue === 0) return '今日';
    if (daysLeftValue === 1) return '明日';
    return `あと${daysLeftValue}日`;
  }
  if (status === 'soon') return `あと${daysLeftValue}日`;
  return `あと${daysLeftValue}日`;
}

export function ymdLabel(iso: string): string {
  const d = fromISODate(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
