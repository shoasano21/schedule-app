import type { EventItem } from './Event';

export interface SharedSchedule {
  id: string;
  name: string;
  generatedAt: number;
  importedAt: number;
  events: EventItem[];
}

export interface ScheduleShareFile {
  app: 'cadence';
  type: 'schedule-share';
  version: 1;
  name: string;
  generatedAt: number;
  events: EventItem[];
}

export const SCHEDULE_SHARE_VERSION = 1;
