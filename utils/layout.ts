import type { EventItem } from '../types/Event';

export interface LaidOut {
  event: EventItem;
  columnIndex: number;
  columnCount: number;
}

export function layoutDayEvents(events: EventItem[]): LaidOut[] {
  const sorted = [...events].sort((a, b) => a.startH - b.startH || a.endH - b.endH);
  const result: LaidOut[] = [];
  let cluster: EventItem[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    const columns: EventItem[][] = [];
    for (const ev of cluster) {
      let placed = false;
      for (const col of columns) {
        if (col[col.length - 1].endH <= ev.startH) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([ev]);
    }
    const total = columns.length;
    columns.forEach((col, idx) => {
      for (const ev of col) {
        result.push({ event: ev, columnIndex: idx, columnCount: total });
      }
    });
    cluster = [];
    clusterEnd = -1;
  };

  for (const ev of sorted) {
    if (cluster.length === 0 || ev.startH < clusterEnd) {
      cluster.push(ev);
      clusterEnd = Math.max(clusterEnd, ev.endH);
    } else {
      flush();
      cluster.push(ev);
      clusterEnd = ev.endH;
    }
  }
  flush();
  return result;
}
