import { useEffect, useState } from 'react';
import { END_HOUR, HOUR_HEIGHT, START_HOUR, nowFractionalHour } from '../utils/date';

export function useNowLine(): { topPx: number; visible: boolean; hourFloat: number } {
  const [hourFloat, setHourFloat] = useState(() => nowFractionalHour());

  useEffect(() => {
    const id = setInterval(() => setHourFloat(nowFractionalHour()), 60_000);
    return () => clearInterval(id);
  }, []);

  const visible = hourFloat >= START_HOUR && hourFloat <= END_HOUR;
  const topPx = (hourFloat - START_HOUR) * HOUR_HEIGHT;

  return { topPx, visible, hourFloat };
}
