import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { MachineDataPersistenceModule } from './machine-data-persistence.module.js';
import { MachineDataController } from './machine-data.controller.js';
import { MachineDataService } from './machine-data.service.js';
import { ManualProcessController } from './manual-process.controller.js';
import { ManualProcessService } from './manual-process.service.js';
import { ManualProcessRepository } from './manual-process.repository.js';
import { PrismaManualProcessRepository } from './prisma-manual-process.repository.js';
@Module({ imports: [MachineDataPersistenceModule, RealtimeModule], controllers: [MachineDataController, ManualProcessController],
  providers: [MachineDataService, ManualProcessService, { provide: ManualProcessRepository, useClass: PrismaManualProcessRepository }] })
export class MachineDataModule {}
