import type { EventEnvelope, JsonObject } from './common.js';

/**
 * Dynamic readings are intentionally not constrained to registered measurement
 * definitions. Consumers must preserve every valid JSON key.
 */
export type DataReadings = JsonObject;

export type MachineDataEvent = EventEnvelope<'machine.data', DataReadings>;

export type DeviceDataEvent = EventEnvelope<'device.data', DataReadings>;

export type DataEvent = DeviceDataEvent | MachineDataEvent;
