import { Injectable } from '@nestjs/common';
import type { MachineDataEvent, MachineReading, MachineRunView, JsonObject, ManualFieldDefinition } from '@industrial-iot-platform/contracts';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { MachineRun, ProcessData, User } from '../generated/prisma/client.js';
import { scopeFilters } from '../catalog/prisma-scope-filters.js';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import { MachineDataRepository } from './machine-data.repository.js';

type Actor = Pick<User, 'id' | 'username' | 'name'>;
export const actorSelect = { id: true, username: true, name: true } as const;
export const runInclude = { startedBy: { select: actorSelect }, closedBy: { select: actorSelect } } as const;
export function runView(run: MachineRun & { startedBy?: Actor | null; closedBy?: Actor | null; _count?: { data: number } }): MachineRunView {
  return { origin: run.origin === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC', startedBy: run.startedBy ?? null, closedBy: run.closedBy ?? null,
    ...(run._count ? { readingCount: run._count.data } : {}),
    id: run.id, startedAt: run.startedAt.toISOString(), finishedAt: run.finishedAt?.toISOString() ?? null,
    lastHeartbeatAt: run.lastHeartbeatAt.toISOString(), durationSeconds: Math.max(0, ((run.finishedAt ?? run.lastHeartbeatAt).getTime() - run.startedAt.getTime()) / 1000) };
}
function sampleView(row: ProcessData & { run: MachineRun | null; recordedBy?: Actor | null }): MachineReading {
  return { machineId: row.machineId, eventId: row.eventId, eventTime: row.eventTime.toISOString(), receivedAt: row.receivedAt.toISOString(),
    readings: row.readings as JsonObject, sourceType: row.sourceType === 'MANUAL' ? 'MANUAL' : row.sourceType === 'NODE_RED' ? 'NODE_RED' : 'MQTT_DIRECT', persisted: true,
    responsible: row.recordedBy ?? null,
    running: null, run: row.run ? runView(row.run) : null };
}
@Injectable()
export class PrismaMachineDataRepository extends MachineDataRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async ingest(code: string, event: MachineDataEvent, receivedAt: Date, observerId: string): Promise<MachineReading | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM core.machines WHERE code = ${code} FOR UPDATE`);
      if (!locked[0]) return null;
      const machine = await tx.machine.findUniqueOrThrow({ where: { id: locked[0].id }, include: { ingestionState: true } });
      if (!machine.isActive) return null;
      const state = machine.ingestionState; const eventTime = new Date(event.eventTime);
      if (state && (state.lastEventId === event.eventId || eventTime <= state.lastEventTime)) return null;
      if (await tx.processData.findUnique({ where: { machineId_eventId: { machineId: machine.id, eventId: event.eventId } }, select: { id: true } })) return null;
      const rawRunning = Object.hasOwn(event.payload, machine.runningKey) ? event.payload[machine.runningKey] : undefined;
      const running = typeof rawRunning === 'boolean' ? rawRunning : null;
      let run: MachineRun | null = await tx.machineRun.findFirst({ where: { machineId: machine.id, finishedAt: null }, include: runInclude });
      let persisted = false;
      const sourceType = event.source.service === 'nodered' ? 'NODE_RED' : 'MQTT_DIRECT';
      const beforeManualClose = !run && await tx.machineRun.findFirst({ where: { machineId: machine.id, origin: 'MANUAL', finishedAt: { gte: eventTime } }, select: { id: true } });
      if (run?.origin === 'MANUAL' || beforeManualClose) {
        // MQTT still refreshes variables, but cannot alter or sample a human-managed run.
      } else if (running === true) {
        const opening = !run;
        run = run
          ? await tx.machineRun.update({ where: { id: run.id }, data: { lastHeartbeatAt: eventTime, observerId } })
          : await tx.machineRun.create({ data: { machineId: machine.id, startedAt: eventTime, lastHeartbeatAt: eventTime, observerId } });
        persisted = opening || !state?.lastPersistedAt || receivedAt.getTime() - state.lastPersistedAt.getTime() >= machine.persistenceIntervalSeconds * 1000;
        if (persisted) await tx.processData.create({ data: { machineId: machine.id, machineRunId: run.id, eventId: event.eventId,
          eventTime, receivedAt, sourceType, readings: JSON.parse(JSON.stringify(event.payload)) as Prisma.InputJsonObject } });
      } else if (running === false && run) {
        run = await tx.machineRun.update({ where: { id: run.id }, data: {
          finishedAt: run.observerId === observerId ? eventTime : run.lastHeartbeatAt,
        } });
      }
      const cursor = { lastEventId: event.eventId, lastEventTime: eventTime, lastPersistedAt: persisted ? receivedAt : state?.lastPersistedAt ?? null };
      await tx.machineIngestionState.upsert({ where: { machineId: machine.id }, create: { machineId: machine.id, ...cursor }, update: cursor });
      return { machineId: machine.id, eventId: event.eventId, eventTime: eventTime.toISOString(), receivedAt: receivedAt.toISOString(),
        readings: event.payload, sourceType, persisted, running, run: run ? runView(run) : null };
    });
  }
  async detail(id: string, access: CatalogAccess) {
    const machine = await this.prisma.machine.findFirst({ where: { AND: [{ id }, scopeFilters(access).machine] }, include: { area: true } });
    return machine ? { id: machine.id, name: machine.name, code: machine.code, area: machine.area.name,
      persistenceIntervalSeconds: machine.persistenceIntervalSeconds, runningKey: machine.runningKey,
      registrationMode: machine.registrationMode === 'MANUAL' ? 'MANUAL' as const : 'AUTOMATIC' as const,
      manualFormDefinition: machine.manualFormDefinition as unknown as ManualFieldDefinition[] } : null;
  }
  async runs(id: string) {
    return (await this.prisma.machineRun.findMany({ where: { machineId: id }, include: { ...runInclude, _count: { select: { data: true } } }, orderBy: [{ startedAt: 'desc' }, { id: 'desc' }], take: 10 })).map(runView);
  }
  async latestSample(id: string) {
    const sample = await this.prisma.processData.findFirst({ where: { machineId: id }, orderBy: [{ eventTime: 'desc' }, { id: 'desc' }], include: { run: { include: runInclude }, recordedBy: { select: actorSelect } } });
    return sample ? sampleView(sample) : null;
  }
  async runSamples(machineId: string, runId: string, page: number) {
    if (!await this.prisma.machineRun.findFirst({ where: { id: runId, machineId } })) return null;
    const rows = await this.prisma.processData.findMany({ where: { machineId, machineRunId: runId }, include: { run: { include: runInclude }, recordedBy: { select: actorSelect } },
      orderBy: [{ eventTime: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 21 });
    return { items: rows.slice(0, 20).map(sampleView), page, hasMore: rows.length > 20 };
  }
}
