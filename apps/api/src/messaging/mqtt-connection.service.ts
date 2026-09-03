import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type IClientOptions, type MqttClient } from 'mqtt';

@Injectable()
export class MqttConnectionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MqttConnectionService.name);
  private client: MqttClient | undefined;
  private connected = false;

  constructor(private readonly config: ConfigService) {}

  onApplicationBootstrap(): void {
    const options: IClientOptions = {
      clean: true,
      clientId: `industrial-api-${process.pid}`,
      connectTimeout: 5_000,
      reconnectPeriod: 2_000,
    };
    const username = this.config.get<string>('MQTT_USERNAME')?.trim();
    const password = this.config.get<string>('MQTT_PASSWORD');

    if (username !== undefined && username.length > 0) {
      options.username = username;

      if (password !== undefined) {
        options.password = password;
      }
    }

    const host = this.config.getOrThrow<string>('MQTT_HOST');
    const port = this.config.getOrThrow<number>('MQTT_PORT');
    this.client = connect(`mqtt://${host}:${port}`, options);

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Connected to the local MQTT broker');
    });
    this.client.on('close', () => {
      this.connected = false;
    });
    this.client.on('error', (error: Error) => {
      this.connected = false;
      this.logger.warn(`MQTT connection error: ${error.message}`);
    });
  }

  isReady(): boolean {
    return this.connected && this.client?.connected === true;
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.client;

    if (client === undefined) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      client.end(false, {}, (error?: Error) => {
        if (error === undefined) {
          resolve();
          return;
        }

        reject(error);
      });
    });
  }
}
