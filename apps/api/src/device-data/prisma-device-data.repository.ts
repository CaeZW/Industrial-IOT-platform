import { Injectable } from '@nestjs/common';
import type { DeviceDataEvent, DeviceReading, JsonObject } from '@industrial-iot-platform/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { DeviceData } from '../generated/prisma/client.js';
import { scopeFilters } from '../catalog/prisma-scope-filters.js';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import { DeviceDataRepository } from './device-data.repository.js';

function reading(row: DeviceData): DeviceReading {
  return { deviceId: row.deviceId, eventId: row.eventId, eventTime: row.eventTime.toISOString(),
    receivedAt: row.receivedAt.toISOString(), readings: row.readings as JsonObject,
    sourceType: row.sourceType === 'NODE_RED' ? 'NODE_RED' : 'MQTT_DIRECT', persisted: true };
}
@Injectable()
export class PrismaDeviceDataRepository extends DeviceDataRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async ingest(code: string, event: DeviceDataEvent, receivedAt: Date): Promise<DeviceReading | null> {
    return this.prisma.$transaction(async (tx) => {
      // Lock even before the first cursor exists; serializes concurrent consumers.
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM core.devices WHERE code = ${code} FOR UPDATE`);
      if (!locked[0]) return null;
      const device = await tx.device.findUniqueOrThrow({ where: { id: locked[0].id }, include: { ingestionState: true } });
      if (!device.isActive) return null;
      const state = device.ingestionState;
      const eventTime = new Date(event.eventTime);
      if (state && (event.eventId === state.lastEventId || eventTime <= state.lastEventTime)) return null;
      if (await tx.deviceData.findUnique({ where: { deviceId_eventId: { deviceId: device.id, eventId: event.eventId } }, select: { id: true } })) return null;
      const persisted = !state || receivedAt.getTime() - state.lastPersistedAt.getTime() >= device.persistenceIntervalSeconds * 1000;
      const sourceType = event.source.service === 'nodered' ? 'NODE_RED' : 'MQTT_DIRECT';
      if (persisted) await tx.deviceData.create({ data: { deviceId: device.id, eventId: event.eventId, eventTime,
        receivedAt, sourceType, readings: JSON.parse(JSON.stringify(event.payload)) as Prisma.InputJsonObject } });
      const data = { lastEventId: event.eventId, lastEventTime: eventTime, lastPersistedAt: persisted ? receivedAt : state!.lastPersistedAt };
      await tx.deviceIngestionState.upsert({ where: { deviceId: device.id }, create: { deviceId: device.id, ...data }, update: data });
      return { deviceId: device.id, eventId: event.eventId, eventTime: eventTime.toISOString(), receivedAt: receivedAt.toISOString(),
        readings: event.payload, sourceType, persisted };
    });
  }
  async detail(id: string, access: CatalogAccess) {
    const device = await this.prisma.device.findFirst({ where: { AND: [{ id }, scopeFilters(access).device] }, include: { area: true } });
    return device ? { id: device.id, name: device.name, code: device.code, area: device.area.name, persistenceIntervalSeconds: device.persistenceIntervalSeconds } : null;
  }
  async history(id: string, page: number) {
    const rows = await this.prisma.deviceData.findMany({ where: { deviceId: id }, orderBy: [{ eventTime: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 21 });
    return { items: rows.slice(0, 20).map(reading), page, hasMore: rows.length > 20 };
  }
}
