import type { ColorId, EventItem } from '../types/Event';

interface ParsedEvent {
  uid: string;
  summary: string;
  startISO: string; // YYYY-MM-DD
  startH: number; // 0-23 hour part
  endISO?: string;
  endH?: number;
  location?: string;
  description?: string;
}

/**
 * 簡易 iCalendar (.ics) パーサ。
 * - VEVENT 単位で抽出
 * - DTSTART / DTEND が DATE-TIME (TZID 付き含む) または DATE-only に対応
 * - すべて Asia/Tokyo として解釈する (TZID 文字列は無視)
 * - SUMMARY / LOCATION / DESCRIPTION のエスケープを解除
 */
export function parseICS(text: string): ParsedEvent[] {
  // RFC 5545: line folding (CRLF + space) を解除
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/);

  const out: ParsedEvent[] = [];
  let cur: Partial<ParsedEvent> | null = null;

  for (const raw of lines) {
    if (raw === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (raw === 'END:VEVENT') {
      if (cur && cur.summary && cur.startISO) {
        out.push({
          uid: cur.uid ?? `imp-${out.length}`,
          summary: cur.summary,
          startISO: cur.startISO,
          startH: cur.startH ?? 0,
          endISO: cur.endISO,
          endH: cur.endH,
          location: cur.location,
          description: cur.description,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    // KEY[;PARAM=v]:VALUE
    const colonIdx = raw.indexOf(':');
    if (colonIdx < 0) continue;
    const left = raw.slice(0, colonIdx);
    const value = raw.slice(colonIdx + 1);
    const [name] = left.split(';');

    if (name === 'UID') cur.uid = value;
    else if (name === 'SUMMARY') cur.summary = unescapeICS(value);
    else if (name === 'LOCATION') cur.location = unescapeICS(value);
    else if (name === 'DESCRIPTION') cur.description = unescapeICS(value);
    else if (name === 'DTSTART') {
      const parsed = parseDateValue(value);
      if (parsed) {
        cur.startISO = parsed.iso;
        cur.startH = parsed.hour;
      }
    } else if (name === 'DTEND') {
      const parsed = parseDateValue(value);
      if (parsed) {
        cur.endISO = parsed.iso;
        cur.endH = parsed.hour;
      }
    }
  }
  return out;
}

function unescapeICS(s: string): string {
  return s
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseDateValue(v: string): { iso: string; hour: number } | null {
  // 8桁 = DATE only (YYYYMMDD), or 8+T+6/7 桁 = DATE-TIME
  // 末尾の Z は UTC を意味するが Asia/Tokyo 扱いに簡略化 (= +9h shift しない)
  const compact = v.replace(/Z$/, '');
  const dateMatch = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2}))?$/.exec(compact);
  if (!dateMatch) return null;
  const [, y, m, d, hh] = dateMatch;
  return {
    iso: `${y}-${m}-${d}`,
    hour: hh ? parseInt(hh, 10) : 0,
  };
}

const COLOR_CYCLE: ColorId[] = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'pink', 'indigo'];

/**
 * パース結果を EventItem 配列に変換。色は import 時に巡回割り当て。
 */
export function icsToEvents(parsed: ParsedEvent[]): Omit<EventItem, 'id'>[] {
  return parsed.map((p, i) => {
    const startH = Math.min(23, Math.max(0, p.startH));
    let endH = p.endH != null ? Math.min(24, Math.max(startH + 1, p.endH)) : startH + 1;
    // 終日イベント (00:00 - 24:00) のような場合はそのまま 0-24
    if (endH <= startH) endH = startH + 1;
    return {
      title: p.summary.slice(0, 40),
      date: p.startISO,
      startH,
      endH,
      color: COLOR_CYCLE[i % COLOR_CYCLE.length],
      location: (p.location ?? '').slice(0, 40),
      memo: (p.description ?? '').slice(0, 200),
    };
  });
}
