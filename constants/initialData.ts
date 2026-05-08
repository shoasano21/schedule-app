import type { EventItem } from '../types/Event';

function isoDateOffset(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const SAMPLE_EVENTS: EventItem[] = [
  {
    id: 'sample-1',
    title: '朝の読書',
    date: isoDateOffset(0),
    startH: 7,
    endH: 8,
    color: 'blue',
    location: '自宅',
    memo: '英語の本を30分',
  },
  {
    id: 'sample-2',
    title: 'チームMTG',
    date: isoDateOffset(0),
    startH: 10,
    endH: 11,
    color: 'orange',
    location: 'Zoom',
    memo: '週次定例',
  },
  {
    id: 'sample-3',
    title: 'ランチ',
    date: isoDateOffset(0),
    startH: 12,
    endH: 13,
    color: 'green',
    location: '',
    memo: '',
  },
  {
    id: 'sample-4',
    title: '英語',
    date: isoDateOffset(1),
    startH: 19,
    endH: 21,
    color: 'purple',
    location: 'カフェ',
    memo: 'TOEIC対策',
  },
  {
    id: 'sample-5',
    title: 'ジム',
    date: isoDateOffset(2),
    startH: 18,
    endH: 19,
    color: 'red',
    location: '',
    memo: '',
  },
  {
    id: 'sample-6',
    title: '部活',
    date: isoDateOffset(3),
    startH: 16,
    endH: 18,
    color: 'teal',
    location: '体育館',
    memo: '',
  },
];
