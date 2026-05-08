import { useCallback, useMemo, useState } from 'react';
import { addDays, startOfWeek, toISODate } from '../utils/date';

export interface MonthCell {
  date: Date;
  iso: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  dow: number; // 0=Sun..6=Sat
}

export interface MonthDay {
  date: Date;
  iso: string;
  day: number;
  dow: number;
  isToday: boolean;
}

const ROWS = 6;

export function useMonth() {
  const [monthOffset, setMonthOffset] = useState(0);

  const baseMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const cells = useMemo<MonthCell[]>(() => {
    const today = toISODate(new Date());
    const firstOfMonth = new Date(baseMonth);
    const gridStart = startOfWeek(firstOfMonth);
    return Array.from({ length: ROWS * 7 }, (_, i) => {
      const d = addDays(gridStart, i);
      const iso = toISODate(d);
      return {
        date: d,
        iso,
        isCurrentMonth: d.getMonth() === baseMonth.getMonth(),
        isToday: iso === today,
        dow: d.getDay(),
      };
    });
  }, [baseMonth]);

  const daysOfMonth = useMemo<MonthDay[]>(() => {
    const today = toISODate(new Date());
    const year = baseMonth.getFullYear();
    const month = baseMonth.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const out: MonthDay[] = [];
    for (let day = 1; day <= lastDay; day++) {
      const d = new Date(year, month, day);
      const iso = toISODate(d);
      out.push({
        date: d,
        iso,
        day,
        dow: d.getDay(),
        isToday: iso === today,
      });
    }
    return out;
  }, [baseMonth]);

  const label = useMemo(
    () => `${baseMonth.getFullYear()}年 ${baseMonth.getMonth() + 1}月`,
    [baseMonth]
  );

  const goPrev = useCallback(() => setMonthOffset((o) => o - 1), []);
  const goNext = useCallback(() => setMonthOffset((o) => o + 1), []);
  const goToday = useCallback(() => setMonthOffset(0), []);

  return {
    monthOffset,
    baseMonth,
    cells,
    daysOfMonth,
    label,
    goPrev,
    goNext,
    goToday,
  };
}
