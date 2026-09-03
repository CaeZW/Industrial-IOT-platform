import { Global, Module } from '@nestjs/common';

import { MqttConnectionService } from './mqtt-connection.service.js';

@Global()
@Module({
  providers: [MqttConnectionService],
  exports: [MqttConnectionService],
})
export class MessagingModule {}
