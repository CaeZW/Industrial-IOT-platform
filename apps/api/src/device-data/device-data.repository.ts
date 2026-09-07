import type { DeviceDataEvent, DeviceDataView, DeviceHistoryPage, DeviceReading } from '@industrial-iot-platform/contracts';
import type { CatalogAccess } from '../catalog/catalog-access.js';
export abstract class DeviceDataRepository {
  abstract ingest(code: string, event: DeviceDataEvent, receivedAt: Date): Promise<DeviceReading | null>;
  abstract detail(id: string, access: CatalogAccess): Promise<DeviceDataView['device'] | null>;
  abstract history(id: string, page: number): Promise<DeviceHistoryPage>;
}
export abstract class DeviceRealtimePort {
  abstract publishDevice(reading: DeviceReading): Promise<void>;
}
