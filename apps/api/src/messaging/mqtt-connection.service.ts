import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, type IClientOptions, type MqttClient } from 'mqtt';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MqttConnectionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MqttConnectionService.name);
  private client: MqttClient | undefined;
  private connected = false;
  private connectionId = randomUUID();
  private readonly machineListeners = new Set<(topic: string, payload: Buffer, retained: boolean) => void>();
  observationConnectionId(): string { return this.connectionId; }
  onMachineMessage(listener: (topic: string, payload: Buffer, retained: boolean) => void): () => void {
    this.machineListeners.add(listener); return () => { this.machineListeners.delete(listener); };
  }
  private readonly deviceListeners = new Set<(topic: string, payload: Buffer, retained: boolean) => void>();
  onDeviceMessage(listener: (topic: string, payload: Buffer, retained: boolean) => void): () => void {
    this.deviceListeners.add(listener);
    return () => { this.deviceListeners.delete(listener); };
  }

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
      this.connectionId = randomUUID();
      const topics = ['iot/v1/devices/+/data', 'iot/v1/machines/+/data'];
      this.client!.subscribe(topics, { qos: 1 }, (error, grants) => {
        this.connected = !error && topics.every((topic) => grants?.some((grant) => grant.topic === topic && grant.qos <= 1));
        if (this.connected) this.logger.log('MQTT machine/device data subscriptions ready');
        else this.logger.error('MQTT data subscription failed');
      });
    });
    this.client.on('message', (topic, payload, packet) => {
      const listeners = topic.startsWith('iot/v1/machines/') ? this.machineListeners : this.deviceListeners;
      for (const listener of listeners) listener(topic, payload, packet.retain);
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
