export type Quality = 'GOOD' | 'BAD' | 'UNCERTAIN' | 'STALE';

export type JsonPrimitive = boolean | null | number | string;

export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type JsonObject = Readonly<Record<string, JsonValue>>;

export type SourceType = 'MANUAL' | 'MQTT_DIRECT' | 'NODE_RED';

export interface SourceRef {
  plantId?: string;
  areaId?: string;
  machineId?: string;
  deviceId?: string;
}

export interface EventEnvelope<TType extends string, TPayload> {
  eventId: string;
  eventType: TType;
  schemaVersion: string;
  eventTime: string;
  correlationId?: string;
  source: SourceRef & { service: string };
  payload: TPayload;
}
