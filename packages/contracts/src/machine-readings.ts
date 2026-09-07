import type { JsonObject } from './common.js';
export interface MachineRunView {
  readonly readingCount?: number;
  readonly origin?: 'AUTOMATIC' | 'MANUAL';
  readonly startedBy?: ResponsibleUser | null;
  readonly closedBy?: ResponsibleUser | null;
  readonly id: string;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly lastHeartbeatAt: string;
  readonly durationSeconds: number;
}
export interface MachineReading {
  readonly machineId: string;
  readonly eventId: string;
  readonly eventTime: string;
  readonly receivedAt: string;
  readonly readings: JsonObject;
  readonly sourceType: 'NODE_RED' | 'MQTT_DIRECT' | 'MANUAL';
  readonly responsible?: ResponsibleUser | null;
  readonly persisted: boolean;
  readonly running: boolean | null;
  readonly run: MachineRunView | null;
}
export interface ResponsibleUser { readonly id: string; readonly username: string; readonly name: string }
export interface ManualProcessInput {
  readonly idempotencyKey: string;
  readonly readings?: JsonObject;
  readonly startedAt?: string;
  readonly finishedAt?: string;
}
export interface ManualFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly type: 'number' | 'text' | 'boolean';
}
export interface MachineDataView {
  readonly machine: { readonly id: string; readonly name: string; readonly code: string | null;
    readonly area: string; readonly persistenceIntervalSeconds: number; readonly runningKey: string;
    readonly registrationMode: 'AUTOMATIC' | 'MANUAL'; readonly manualFormDefinition: readonly ManualFieldDefinition[] };
  readonly latest: MachineReading | null;
  readonly latestOrigin: 'LIVE' | 'HISTORY' | 'NONE';
  readonly runs: readonly MachineRunView[];
}
export interface ProcessDataPage {
  readonly items: readonly MachineReading[];
  readonly page: number;
  readonly hasMore: boolean;
}
