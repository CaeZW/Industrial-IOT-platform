import { Module } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway.js';
import { DeviceDataPersistenceModule } from '../device-data/device-data-persistence.module.js';
import { DeviceRealtimePort } from '../device-data/device-data.repository.js';
import { MachineRealtimePort } from '../machine-data/machine-data.repository.js';
import { MachineDataPersistenceModule } from '../machine-data/machine-data-persistence.module.js';

@Module({
  imports: [DeviceDataPersistenceModule, MachineDataPersistenceModule],
  providers: [RealtimeGateway, { provide: DeviceRealtimePort, useExisting: RealtimeGateway }, { provide: MachineRealtimePort, useExisting: RealtimeGateway }],
  exports: [DeviceRealtimePort, MachineRealtimePort],
})
export class RealtimeModule {}
