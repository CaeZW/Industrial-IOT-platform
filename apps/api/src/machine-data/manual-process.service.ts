import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { ManualProcessInput } from '@industrial-iot-platform/contracts';
import type { AuditInput, RequestContext, SessionRecord } from '../auth/auth.types.js';
import { AuthRepository } from '../auth/auth.repository.js';
import { ManualProcessRepository } from './manual-process.repository.js';
import type { ManualAction } from './manual-process.repository.js';
import { MachineDataService } from './machine-data.service.js';
import { validateManualReadings } from './manual-process.dto.js';
@Injectable()
export class ManualProcessService {
  private readonly logger = new Logger(ManualProcessService.name);
  constructor(private readonly repository: ManualProcessRepository, private readonly audit: AuthRepository,
    private readonly data: MachineDataService) {}
  async execute(machineId: string, runId: string | undefined, action: ManualAction, input: ManualProcessInput,
    session: SessionRecord, context: RequestContext) {
    const audit: AuditInput = { ...context, userId: session.user.id, actor: session.user.username,
      action: 'machine.manual.' + action, resourceType: 'MACHINE', resourceId: machineId, result: 'SUCCESS', reason: 'MANUAL_PROCESS' };
    let result;
    try {
      const completedControl = action === 'start' && input.startedAt !== undefined && input.finishedAt !== undefined;
      if (action === 'start' && (input.startedAt === undefined) !== (input.finishedAt === undefined)) {
        throw new BadRequestException('Completa inicio y parada del control de horas.');
      }
      validateManualReadings(input.readings, action !== 'close' && !completedControl);
      result = await this.repository.execute(machineId, runId, action, input, session, audit);
    } catch (error) {
      await this.audit.audit({ ...audit, result: 'DENIED', reason: 'MANUAL_PROCESS_REJECTED' });
      throw error;
    }
    // SQL commit is authoritative. A notification failure must not turn a saved form into an HTTP failure.
    if (!result.replayed) {
      try { await this.data.publishManual(result.reading); } catch { this.logger.error('machine.manual.notification_failed'); }
    }
    return result.reading;
  }
}
