import type { MachineReading, ManualProcessInput } from '@industrial-iot-platform/contracts';
import type { AuditInput, SessionRecord } from '../auth/auth.types.js';
export type ManualAction = 'start' | 'reading' | 'close';
export abstract class ManualProcessRepository {
  abstract execute(machineId: string, runId: string | undefined, action: ManualAction,
    input: ManualProcessInput, session: SessionRecord, audit: AuditInput): Promise<{ reading: MachineReading; replayed: boolean }>;
}
