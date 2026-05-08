export type TaskTypeId =
  | 'report'
  | 'problem'
  | 'memory'
  | 'reading'
  | 'lab'
  | 'presentation'
  | 'quiz'
  | 'exam'
  | 'group'
  | 'other';

export type TaskStatus = 'done' | 'past' | 'urgent' | 'soon' | 'ok';

export interface Task {
  id: string;
  course: string;
  title: string;
  type: TaskTypeId;
  desc: string;
  start: string;
  end: string;
  done: boolean;
  remindDays: number;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  day: number;
  period: number;
}

export interface PeriodTime {
  start: string;
  end: string;
}

export const TASK_TYPE_IDS: TaskTypeId[] = [
  'report',
  'problem',
  'memory',
  'reading',
  'lab',
  'presentation',
  'quiz',
  'exam',
  'group',
  'other',
];
