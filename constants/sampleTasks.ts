import type { Task } from '../types/Task';

function isoOffset(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const SAMPLE_TASKS: Task[] = [
  {
    id: 'task-1',
    course: '細胞生物学',
    title: '第2回レポート',
    type: 'report',
    desc: '細胞周期とチェックポイントについて A4 2 枚',
    start: isoOffset(-7),
    end: isoOffset(7),
    done: false,
    remindDays: 3,
  },
  {
    id: 'task-2',
    course: '化学Ⅰ',
    title: '反応速度の問題集',
    type: 'problem',
    desc: '教科書 p.45〜60 の練習問題',
    start: isoOffset(-3),
    end: isoOffset(2),
    done: false,
    remindDays: 3,
  },
  {
    id: 'task-3',
    course: '解剖学',
    title: '骨格系の暗記',
    type: 'memory',
    desc: '上肢骨の全名称・起始停止',
    start: isoOffset(-2),
    end: isoOffset(14),
    done: false,
    remindDays: 3,
  },
  {
    id: 'task-4',
    course: '物理学Ⅰ',
    title: '力学小テスト対策',
    type: 'memory',
    desc: '公式と例題 10 問',
    start: isoOffset(0),
    end: isoOffset(5),
    done: false,
    remindDays: 1,
  },
];
