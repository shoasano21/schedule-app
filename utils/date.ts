export const HOUR_HEIGHT = 48;
export const START_HOUR = 0;
export const END_HOUR = 24;
export const HOURS_RANGE = END_HOUR - START_HOUR;

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dow = out.getDay();
  const diff = (dow + 6) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function getWeekDates(weekOffset: number): Date[] {
  const monday = startOfWeek(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatHour(h: number): string {
  return `${pad2(h)}:00`;
}

export function formatHourRange(startH: number, endH: number): string {
  return `${pad2(startH)}:00 — ${pad2(endH)}:00`;
}

export function isToday(date: string): boolean {
  return date === toISODate(new Date());
}

export function weekLabelJa(weekOffset: number, weekDates: Date[]): string {
  const first = weekDates[0];
  const last = weekDates[6];
  const ym = `${first.getFullYear()}年 ${first.getMonth() + 1}月`;
  const sameMonth = first.getMonth() === last.getMonth();
  const range = sameMonth
    ? `${first.getDate()}–${last.getDate()}日`
    : `${first.getMonth() + 1}/${first.getDate()}–${last.getMonth() + 1}/${last.getDate()}`;
  if (weekOffset === 0) return `今週・${ym}`;
  return `${ym} (${range})`;
}

export const WEEKDAY_JA = ['月', '火', '水', '木', '金', '土', '日'] as const;

export function durationHours(startH: number, endH: number): number {
  return Math.max(0, endH - startH);
}

export function nowFractionalHour(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}
