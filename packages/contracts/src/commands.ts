import type { EventEnvelope } from './common.js';

export type CommandStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'DISPATCHED'
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'REJECTED'
  | 'CANCELLED';

export interface CommandRequestedPayload {
  commandId: string;
  machineId: string;
  deviceId?: string;
  commandType: string;
  parameters: Record<string, unknown>;
  requestedBy: string;
}

export interface CommandResultPayload {
  commandId: string;
  status: CommandStatus;
  result?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
}

export type CommandRequestedEvent = EventEnvelope<
  'command.requested',
  CommandRequestedPayload
>;

export type CommandResultEvent = EventEnvelope<
  'command.result',
  CommandResultPayload
>;
