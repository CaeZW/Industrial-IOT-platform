export type Quality = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'STALE';

export type DeviceState = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNKNOWN';

export interface SourceRef {
  plantId?: string;
  areaId?: string;
  lineId?: string;
  machineId?: string;
  deviceId?: string;
}

export interface EventEnvelope<TType extends string, TPayload> {
  eventId: string;
  eventType: TType;
  schemaVersion: string;
  timestamp: string;
  correlationId?: string;
  source: SourceRef & { service: string };
  payload: TPayload;
}
