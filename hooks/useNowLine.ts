import { useEffect, useState } from 'react';
import { HOUR_HEIGHT, nowFractionalHour } from '../utils/date';

export function useNowLine(
  startHour = 0,
  endHour = 24
): { topPx: number; visible: boolean; hourFloat: number } {
  const [hourFloat, setHourFloat] = useState(() => nowFractionalHour());

  useEffect(() => {
    const id = setInterval(() => setHourFloat(nowFractionalHour()), 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = hourFloat >= startHour && hourFloat <= endHour;
  const topPx = (hourFloat - startHour) * HOUR_HEIGHT;

  return { topPx, visible, hourFloat };
}
