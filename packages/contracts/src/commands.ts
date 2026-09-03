import type { JsonObject } from './common.js';

export type CommandResultStatus =
  | 'ACKNOWLEDGED'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT'
  | 'REJECTED'
  | 'CANCELLED';

export interface MachineCommandMessage {
  commandId: string;
  correlationId: string;
  idempotencyKey: string;
  commandType: string;
  createdAt: string;
  expiresAt: string;
  parameters: JsonObject;
}

export interface MachineCommandResultMessage {
  commandId: string;
  correlationId: string;
  status: CommandResultStatus;
  completedAt?: string;
  result?: JsonObject;
  errorCode?: string;
  errorMessage?: string;
}
