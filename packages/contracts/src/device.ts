import type { DeviceState, EventEnvelope } from './common.js';

export interface DeviceStatusPayload {
  state: DeviceState;
  lastSeen: string;
  latencyMs?: number;
  protocol?: string;
  errorCount?: number;
}

export type DeviceStatusChangedEvent = EventEnvelope<
  'device.status.changed',
  DeviceStatusPayload
>;
