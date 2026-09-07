import { Module } from '@nestjs/common';
import { DeviceDataRepository } from './device-data.repository.js';
import { PrismaDeviceDataRepository } from './prisma-device-data.repository.js';
@Module({ providers: [{ provide: DeviceDataRepository, useClass: PrismaDeviceDataRepository }], exports: [DeviceDataRepository] })
export class DeviceDataPersistenceModule {}
