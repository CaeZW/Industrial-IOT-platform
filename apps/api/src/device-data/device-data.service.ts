import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { DeviceDataView, DeviceReading } from '@industrial-iot-platform/contracts';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import { MqttConnectionService } from '../messaging/mqtt-connection.service.js';
import { DeviceDataRepository, DeviceRealtimePort } from './device-data.repository.js';
import { parseDeviceMessage } from './device-data.validation.js';

@Injectable()
export class DeviceDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceDataService.name);
  private readonly latest = new Map<string, DeviceReading>();
  private pending = 0;
  private chain: Promise<void> = Promise.resolve();
  private unsubscribe: (() => void) | undefined;
  constructor(private readonly repository: DeviceDataRepository, private readonly realtime: DeviceRealtimePort,
    private readonly mqtt: MqttConnectionService) {}
  onModuleInit() {
    this.unsubscribe = this.mqtt.onDeviceMessage((topic, payload, retained) => {
      if (this.pending >= 64) { this.logger.warn('device.ingestion.queue_overflow'); return; }
      const receivedAt = new Date();
      const parsed = parseDeviceMessage(topic, payload, retained, receivedAt.getTime());
      if (!parsed) { this.logger.warn('device.ingestion.invalid_message'); return; }
      this.pending++;
      this.chain = this.chain.then(async () => {
        const result = await this.repository.ingest(parsed.code, parsed.event, receivedAt);
        if (!result) return;
        this.latest.delete(result.deviceId); this.latest.set(result.deviceId, result);
        if (this.latest.size > 1000) this.latest.delete(this.latest.keys().next().value!);
        await this.realtime.publishDevice(result);
      }).catch(() => { this.logger.error('device.ingestion.failed'); }).finally(() => { this.pending--; });
    });
  }
  async onModuleDestroy() { this.unsubscribe?.(); await this.chain; this.latest.clear(); }
  async detail(id: string, access: CatalogAccess): Promise<DeviceDataView> {
    const device = await this.repository.detail(id, access);
    if (!device) throw new NotFoundException('Device inexistente o fuera de tu acceso.');
    const live = this.latest.get(id);
    if (live) return { device, latest: live, latestOrigin: 'LIVE' };
    const history = await this.repository.history(id, 1);
    return { device, latest: history.items[0] ?? null, latestOrigin: history.items.length ? 'HISTORY' : 'NONE' };
  }
  async history(id: string, page: number, access: CatalogAccess) {
    if (!await this.repository.detail(id, access)) throw new NotFoundException('Device inexistente o fuera de tu acceso.');
    return this.repository.history(id, page);
  }
}
