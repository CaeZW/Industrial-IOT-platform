import type { EventEnvelope } from './common.js';

export type CommunicationState =
  | 'DEGRADED'
  | 'OFFLINE'
  | 'ONLINE'
  | 'UNKNOWN';

export type MachineOperationalState =
  | 'FAULT'
  | 'IDLE'
  | 'MAINTENANCE'
  | 'RUNNING'
  | 'STOPPED'
  | 'UNKNOWN';

export interface MachineStatePayload {
  operationalState: MachineOperationalState;
  communicationState?: CommunicationState;
  lastSeenAt?: string;
}

export interface DeviceStatePayload {
  communicationState: CommunicationState;
  lastSeenAt: string;
  latencyMs?: number;
  errorCount?: number;
}

export type MachineStateChangedEvent = EventEnvelope<
  'machine.state.changed',
  MachineStatePayload
>;

export type DeviceStateChangedEvent = EventEnvelope<
  'device.state.changed',
  DeviceStatePayload
>;
