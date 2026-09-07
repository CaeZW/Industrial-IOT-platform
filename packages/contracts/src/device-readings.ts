import type { JsonObject } from './common.js';
export interface DeviceReading {
  readonly deviceId: string;
  readonly eventId: string;
  readonly eventTime: string;
  readonly receivedAt: string;
  readonly readings: JsonObject;
  readonly sourceType: 'NODE_RED' | 'MQTT_DIRECT';
  readonly persisted: boolean;
}
export interface DeviceDataView {
  readonly device: { readonly id: string; readonly name: string; readonly code: string | null;
    readonly area: string; readonly persistenceIntervalSeconds: number };
  readonly latest: DeviceReading | null;
  readonly latestOrigin: 'LIVE' | 'HISTORY' | 'NONE';
}
export interface DeviceHistoryPage {
  readonly items: readonly DeviceReading[];
  readonly page: number;
  readonly hasMore: boolean;
}
