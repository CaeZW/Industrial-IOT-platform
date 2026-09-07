import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { MachineDataView, MachineReading } from '@industrial-iot-platform/contracts';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import { MqttConnectionService } from '../messaging/mqtt-connection.service.js';
import { MachineDataRepository, MachineRealtimePort } from './machine-data.repository.js';
import { parseMachineMessage } from './machine-data.validation.js';
@Injectable()
export class MachineDataService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MachineDataService.name);
  private readonly latest = new Map<string, MachineReading>();
  private observerId = randomUUID(); private connectionId = '';
  private pending = 0; private chain: Promise<void> = Promise.resolve(); private unsubscribe: (() => void) | undefined;
  constructor(private readonly repository: MachineDataRepository, private readonly realtime: MachineRealtimePort,
    private readonly mqtt: MqttConnectionService) {}
  onModuleInit() {
    this.unsubscribe = this.mqtt.onMachineMessage((topic, payload, retained) => {
      if (this.pending >= 64) { this.logger.warn('machine.ingestion.queue_overflow'); this.observerId = randomUUID(); return; }
      const receivedAt = new Date(); const parsed = parseMachineMessage(topic, payload, retained, receivedAt.getTime());
      if (!parsed) { this.logger.warn('machine.ingestion.invalid_message'); return; }
      const connectionId = this.mqtt.observationConnectionId();
      this.pending++;
      this.chain = this.chain.then(async () => {
        if (connectionId !== this.connectionId) { this.observerId = randomUUID(); this.connectionId = connectionId; this.latest.clear(); }
        const result = await this.repository.ingest(parsed.code, parsed.event, receivedAt, this.observerId);
        if (!result) return;
        const current = this.latest.get(result.machineId);
        if (current && Date.parse(current.eventTime) > Date.parse(result.eventTime)) return;
        this.latest.delete(result.machineId); this.latest.set(result.machineId, result);
        if (this.latest.size > 1000) this.latest.delete(this.latest.keys().next().value!);
        await this.realtime.publishMachine(result);
      }).catch(() => { this.observerId = randomUUID(); this.logger.error('machine.ingestion.failed'); }).finally(() => { this.pending--; });
    });
  }
  async onModuleDestroy() { this.unsubscribe?.(); await this.chain; this.latest.clear(); }
  async publishManual(reading: MachineReading) {
    const previous = this.latest.get(reading.machineId);
    if (reading.persisted && (!previous || Date.parse(reading.eventTime) >= Date.parse(previous.eventTime))) {
      this.latest.delete(reading.machineId); this.latest.set(reading.machineId, reading);
      if (this.latest.size > 1000) this.latest.delete(this.latest.keys().next().value!);
    }
    await this.realtime.publishMachine(reading);
  }
  async detail(id: string, access: CatalogAccess): Promise<MachineDataView> {
    const machine = await this.repository.detail(id, access);
    if (!machine) throw new NotFoundException('Máquina inexistente o fuera de tu acceso.');
    const runs = await this.repository.runs(id); const live = this.latest.get(id);
    if (live) return { machine, latest: live, latestOrigin: 'LIVE', runs };
    const latest = await this.repository.latestSample(id);
    return { machine, latest, latestOrigin: latest ? 'HISTORY' : 'NONE', runs };
  }
  async samples(id: string, runId: string, page: number, access: CatalogAccess) {
    if (!await this.repository.detail(id, access)) throw new NotFoundException('Máquina inexistente o fuera de tu acceso.');
    const samples = await this.repository.runSamples(id, runId, page);
    if (!samples) throw new NotFoundException('Control de horas inexistente para esta máquina.');
    return samples;
  }
}
