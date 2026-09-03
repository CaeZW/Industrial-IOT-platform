import type {
  EventEnvelope,
  JsonObject,
  JsonValue,
  SourceRef,
} from './common.js';
import type {
  MachineCommandMessage,
  MachineCommandResultMessage,
} from './commands.js';
import type { DeviceDataEvent, MachineDataEvent } from './data.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SCHEMA_VERSION_PATTERN = /^\d+\.\d+$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.endsWith('Z') &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return true;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item));
  }

  return (
    isRecord(value) && Object.values(value).every((item) => isJsonValue(item))
  );
}

export function isJsonObject(value: unknown): value is JsonObject {
  return isRecord(value) && isJsonValue(value);
}

function isSourceRef(value: unknown): value is SourceRef & { service: string } {
  if (!isRecord(value) || !isNonEmptyString(value.service)) {
    return false;
  }

  return ['plantId', 'areaId', 'machineId', 'deviceId'].every(
    (key) => value[key] === undefined || isNonEmptyString(value[key]),
  );
}

export function isEventEnvelope(
  value: unknown,
): value is EventEnvelope<string, unknown> {
  return (
    isRecord(value) &&
    isUuid(value.eventId) &&
    isNonEmptyString(value.eventType) &&
    typeof value.schemaVersion === 'string' &&
    SCHEMA_VERSION_PATTERN.test(value.schemaVersion) &&
    isUtcTimestamp(value.eventTime) &&
    (value.correlationId === undefined || isUuid(value.correlationId)) &&
    isSourceRef(value.source) &&
    Object.hasOwn(value, 'payload')
  );
}

export function isMachineDataEvent(value: unknown): value is MachineDataEvent {
  return (
    isEventEnvelope(value) &&
    value.eventType === 'machine.data' &&
    isJsonObject(value.payload) &&
    isRecord(value.source) &&
    isNonEmptyString(value.source.machineId)
  );
}

export function isDeviceDataEvent(value: unknown): value is DeviceDataEvent {
  return (
    isEventEnvelope(value) &&
    value.eventType === 'device.data' &&
    isJsonObject(value.payload) &&
    isRecord(value.source) &&
    isNonEmptyString(value.source.deviceId)
  );
}

export function isMachineCommandMessage(
  value: unknown,
): value is MachineCommandMessage {
  return (
    isRecord(value) &&
    isUuid(value.commandId) &&
    isUuid(value.correlationId) &&
    isNonEmptyString(value.idempotencyKey) &&
    isNonEmptyString(value.commandType) &&
    isUtcTimestamp(value.createdAt) &&
    isUtcTimestamp(value.expiresAt) &&
    Date.parse(value.expiresAt) > Date.parse(value.createdAt) &&
    isJsonObject(value.parameters)
  );
}

export function isMachineCommandResultMessage(
  value: unknown,
): value is MachineCommandResultMessage {
  if (
    !isRecord(value) ||
    !isUuid(value.commandId) ||
    !isUuid(value.correlationId)
  ) {
    return false;
  }

  const statuses = new Set([
    'ACKNOWLEDGED',
    'CANCELLED',
    'COMPLETED',
    'FAILED',
    'REJECTED',
    'TIMEOUT',
  ]);

  return (
    typeof value.status === 'string' &&
    statuses.has(value.status) &&
    (value.completedAt === undefined || isUtcTimestamp(value.completedAt)) &&
    (value.result === undefined || isJsonObject(value.result)) &&
    (value.errorCode === undefined || isNonEmptyString(value.errorCode)) &&
    (value.errorMessage === undefined || isNonEmptyString(value.errorMessage))
  );
}
