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

export interface EventItem {
  id: string;
  title: string;
  date: string;
  startH: number;
  endH: number;
  color: ColorId;
  location: string;
  memo: string;
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
