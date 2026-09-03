import type { EventEnvelope, Quality } from './common.js';

export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlarmState = 'NORMAL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';

export interface AlarmPayload {
  alarmId: string;
  machineId: string;
  deviceId?: string;
  tagId?: string;
  severity: AlarmSeverity;
  state: AlarmState;
  message: string;
  value?: number | string | boolean | null;
  threshold?: number;
  quality?: Quality;
  activatedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
}

export type AlarmStateChangedEvent = EventEnvelope<
  'alarm.state.changed',
  AlarmPayload
>;
