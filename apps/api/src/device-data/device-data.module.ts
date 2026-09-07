import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { DeviceDataPersistenceModule } from './device-data-persistence.module.js';
import { DeviceDataController } from './device-data.controller.js';
import { DeviceDataService } from './device-data.service.js';
@Module({ imports: [DeviceDataPersistenceModule, RealtimeModule], controllers: [DeviceDataController], providers: [DeviceDataService] })
export class DeviceDataModule {}
