import { useCallback, useMemo, useState } from 'react';
import { getWeekDates, weekLabelJa } from '../utils/date';

export function useWeek() {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const label = useMemo(() => weekLabelJa(weekOffset, weekDates), [weekOffset, weekDates]);

  const goPrev = useCallback(() => setWeekOffset((o) => o - 1), []);
  const goNext = useCallback(() => setWeekOffset((o) => o + 1), []);
  const goToday = useCallback(() => setWeekOffset(0), []);

  return { weekOffset, weekDates, label, goPrev, goNext, goToday };
}
