export const MQTT_NAMESPACE = 'iot/v1' as const;

export type MachineTopicKind =
  | 'command'
  | 'command/result'
  | 'data'
  | 'event'
  | 'state';

export type DeviceTopicKind = 'data' | 'event' | 'state';

const FORBIDDEN_TOPIC_CHARACTERS = /[/+#]/u;

function assertTopicIdentifier(value: string, label: string): string {
  if (
    value.length === 0 ||
    value.trim() !== value ||
    value.includes('\0') ||
    FORBIDDEN_TOPIC_CHARACTERS.test(value)
  ) {
    throw new TypeError(`${label} is not a valid MQTT topic identifier`);
  }

  return value;
}

export function machineTopic(
  machineId: string,
  kind: MachineTopicKind,
): `${typeof MQTT_NAMESPACE}/machines/${string}/${MachineTopicKind}` {
  const id = assertTopicIdentifier(machineId, 'machineId');
  return `${MQTT_NAMESPACE}/machines/${id}/${kind}`;
}

export function deviceTopic(
  deviceId: string,
  kind: DeviceTopicKind,
): `${typeof MQTT_NAMESPACE}/devices/${string}/${DeviceTopicKind}` {
  const id = assertTopicIdentifier(deviceId, 'deviceId');
  return `${MQTT_NAMESPACE}/devices/${id}/${kind}`;
}

export const MQTT_INGESTION_SUBSCRIPTIONS = Object.freeze({
  deviceData: `${MQTT_NAMESPACE}/devices/+/data`,
  deviceEvent: `${MQTT_NAMESPACE}/devices/+/event`,
  deviceState: `${MQTT_NAMESPACE}/devices/+/state`,
  machineCommandResult: `${MQTT_NAMESPACE}/machines/+/command/result`,
  machineData: `${MQTT_NAMESPACE}/machines/+/data`,
  machineEvent: `${MQTT_NAMESPACE}/machines/+/event`,
  machineState: `${MQTT_NAMESPACE}/machines/+/state`,
} as const);
