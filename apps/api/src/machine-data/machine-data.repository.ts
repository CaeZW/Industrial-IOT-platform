import type { MachineDataEvent, MachineDataView, MachineReading, MachineRunView, ProcessDataPage } from '@industrial-iot-platform/contracts';
import type { CatalogAccess } from '../catalog/catalog-access.js';
export abstract class MachineDataRepository {
  abstract ingest(code: string, event: MachineDataEvent, receivedAt: Date, observerId: string): Promise<MachineReading | null>;
  abstract detail(id: string, access: CatalogAccess): Promise<MachineDataView['machine'] | null>;
  abstract runs(id: string): Promise<MachineRunView[]>;
  abstract latestSample(id: string): Promise<MachineReading | null>;
  abstract runSamples(machineId: string, runId: string, page: number): Promise<ProcessDataPage | null>;
}
export abstract class MachineRealtimePort {
  abstract publishMachine(reading: MachineReading): Promise<void>;
}
