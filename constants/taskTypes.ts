import type { TaskTypeId } from '../types/Task';

export interface TaskTypeMeta {
  id: TaskTypeId;
  label: string;
  emoji: string;
  fg: string;
  bgLight: string;
  bgDark: string;
}

export const TASK_TYPES: Record<TaskTypeId, TaskTypeMeta> = {
  report: {
    id: 'report',
    label: 'レポート',
    emoji: '📝',
    fg: '#6A3DD1',
    bgLight: 'rgba(106,61,209,0.14)',
    bgDark: 'rgba(160,120,235,0.22)',
  },
  problem: {
    id: 'problem',
    label: '問題演習',
    emoji: '✏️',
    fg: '#A8631A',
    bgLight: 'rgba(168,99,26,0.14)',
    bgDark: 'rgba(240,180,90,0.22)',
  },
  memory: {
    id: 'memory',
    label: '暗記',
    emoji: '🧠',
    fg: '#247A3D',
    bgLight: 'rgba(36,122,61,0.14)',
    bgDark: 'rgba(94,201,145,0.22)',
  },
  reading: {
    id: 'reading',
    label: '予習・読書',
    emoji: '📖',
    fg: '#1E5AAA',
    bgLight: 'rgba(30,90,170,0.14)',
    bgDark: 'rgba(120,170,235,0.22)',
  },
  lab: {
    id: 'lab',
    label: '実習・実験',
    emoji: '🧪',
    fg: '#0E7268',
    bgLight: 'rgba(14,114,104,0.14)',
    bgDark: 'rgba(80,200,190,0.22)',
  },
  presentation: {
    id: 'presentation',
    label: '発表',
    emoji: '🎤',
    fg: '#B02A5E',
    bgLight: 'rgba(176,42,94,0.14)',
    bgDark: 'rgba(240,120,170,0.22)',
  },
  quiz: {
    id: 'quiz',
    label: '小テスト',
    emoji: '✅',
    fg: '#C54C10',
    bgLight: 'rgba(197,76,16,0.14)',
    bgDark: 'rgba(255,150,90,0.22)',
  },
  exam: {
    id: 'exam',
    label: '試験対策',
    emoji: '📚',
    fg: '#A81C1C',
    bgLight: 'rgba(168,28,28,0.14)',
    bgDark: 'rgba(240,110,110,0.22)',
  },
  group: {
    id: 'group',
    label: 'グループ',
    emoji: '👥',
    fg: '#0F6D82',
    bgLight: 'rgba(15,109,130,0.14)',
    bgDark: 'rgba(90,200,220,0.22)',
  },
  other: {
    id: 'other',
    label: 'その他',
    emoji: '📌',
    fg: '#4B5167',
    bgLight: 'rgba(75,81,103,0.14)',
    bgDark: 'rgba(160,170,200,0.22)',
  },
};

export const SUBJECT_COLORS = [
  '#7358D9',
  '#E53935',
  '#F06675',
  '#EAA93C',
  '#43A047',
  '#1E88E5',
  '#00ACC1',
  '#8E24AA',
  '#5E3CB8',
  '#EF6C00',
];

export const NUM_PERIODS = 5;
export const TIMETABLE_DAYS = [1, 2, 3, 4, 5] as const;
export const DAY_LABELS_JA = ['', '月', '火', '水', '木', '金'] as const;

import type { PeriodTime } from '../types/Task';

export const DEFAULT_PERIOD_TIMES: Record<number, PeriodTime> = {
  1: { start: '09:00', end: '10:30' },
  2: { start: '10:45', end: '12:15' },
  3: { start: '13:00', end: '14:30' },
  4: { start: '14:45', end: '16:15' },
  5: { start: '16:30', end: '18:00' },
};

export const STATUS_COLORS = {
  done: { fg: '#2BA84A', bgLight: 'rgba(43,168,74,0.14)', bgDark: 'rgba(52,199,89,0.22)' },
  past: { fg: '#FF3B30', bgLight: 'rgba(255,59,48,0.18)', bgDark: 'rgba(255,69,58,0.26)' },
  urgent: { fg: '#FF3B30', bgLight: 'rgba(255,59,48,0.16)', bgDark: 'rgba(255,69,58,0.24)' },
  soon: { fg: '#FF9500', bgLight: 'rgba(255,149,0,0.16)', bgDark: 'rgba(255,159,10,0.24)' },
  ok: { fg: '#0A84FF', bgLight: 'rgba(10,132,255,0.16)', bgDark: 'rgba(94,196,255,0.24)' },
};

export const STATUS_LABELS_JA = {
  done: '完了',
  past: '期限切れ',
  urgent: '緊急',
  soon: '近日',
  ok: '余裕',
};
