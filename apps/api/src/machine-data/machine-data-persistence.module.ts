import { Module } from '@nestjs/common';
import { MachineDataRepository } from './machine-data.repository.js';
import { PrismaMachineDataRepository } from './prisma-machine-data.repository.js';
@Module({ providers: [{ provide: MachineDataRepository, useClass: PrismaMachineDataRepository }], exports: [MachineDataRepository] })
export class MachineDataPersistenceModule {}
