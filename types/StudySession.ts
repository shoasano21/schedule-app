export interface StudySession {
  id: string;
  /** 紐付くイベント (省略時は単発の集中セッション) */
  eventTitle?: string;
  eventColor?: string;
  startedAt: number;
  /** 実際に集中していた秒数 */
  durationSec: number;
  /** Pomodoro 1 セット完了したかどうか */
  completed: boolean;
}
