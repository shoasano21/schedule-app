import type { EventItem } from '../types/Event';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * "YYYY-MM-DD" + 時刻 から iCalendar の DATE-TIME 文字列 (TZID=Asia/Tokyo) を生成。
 * 例: 20260509T140000
 */
function toICSDateTime(dateISO: string, hour: number): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const eventDate = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hour, 0, 0));
  // For TZID=Asia/Tokyo we use local-ish format (no Z suffix)
  return `${eventDate.getUTCFullYear()}${pad2(eventDate.getUTCMonth() + 1)}${pad2(
    eventDate.getUTCDate()
  )}T${pad2(hour)}0000`;
}

function nowStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T${pad2(
    d.getUTCHours()
  )}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`;
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * イベント配列から iCalendar (.ics) ファイル本文を生成。
 * Asia/Tokyo タイムゾーン定義を含めるため iOS Calendar / Google Calendar で正しく取り込まれる。
 */
export function buildICS(events: EventItem[]): string {
  const stamp = nowStamp();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadence//JP',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Cadence',
    'X-WR-TIMEZONE:Asia/Tokyo',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const ev of events) {
    if (!ev.date || ev.endH <= ev.startH) continue;
    const start = toICSDateTime(ev.date, ev.startH);
    const end = toICSDateTime(ev.date, ev.endH);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@cadence.shoasano21`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;TZID=Asia/Tokyo:${start}`);
    lines.push(`DTEND;TZID=Asia/Tokyo:${end}`);
    lines.push(`SUMMARY:${escapeText(ev.title)}`);
    if (ev.location) lines.push(`LOCATION:${escapeText(ev.location)}`);
    if (ev.memo) lines.push(`DESCRIPTION:${escapeText(ev.memo)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
