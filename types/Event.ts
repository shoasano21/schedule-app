export type ColorId =
  | 'blue'
  | 'teal'
  | 'green'
  | 'orange'
  | 'red'
  | 'pink'
  | 'purple'
  | 'indigo'
  | 'brown'
  | 'gray';

export type RepeatFreq = 'daily' | 'weekly' | 'monthly';

export interface RepeatRule {
  freq: RepeatFreq;
  /** 繰り返し終了日 (YYYY-MM-DD, この日まで含む)。省略時は無期限 */
  until?: string;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  startH: number;
  endH: number;
  color: ColorId;
  location: string;
  memo: string;
  /** カウントダウン対象 (重要日) */
  pinned?: boolean;
  /** 繰り返し設定 (省略時は単発) */
  repeat?: RepeatRule;
  /** 展開された仮想インスタンスの場合、元の event id を保持。永続化前のデータには現れない */
  baseId?: string;
}

export const COLOR_IDS: ColorId[] = [
  'blue',
  'teal',
  'green',
  'orange',
  'red',
  'pink',
  'purple',
  'indigo',
  'brown',
  'gray',
];
