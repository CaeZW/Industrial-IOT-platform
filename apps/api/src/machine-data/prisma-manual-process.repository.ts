import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { MachineReading, ManualFieldDefinition, ManualProcessInput } from '@industrial-iot-platform/contracts';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuditInput, SessionRecord } from '../auth/auth.types.js';
import { scopeFilters } from '../catalog/prisma-scope-filters.js';
import { ManualProcessRepository } from './manual-process.repository.js';
import type { ManualAction } from './manual-process.repository.js';
import { runInclude, runView } from './prisma-machine-data.repository.js';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => JSON.stringify(key) + ':' + canonical(item)).join(',') + '}';
  return JSON.stringify(value);
}
function validateTemplate(definition: unknown, readings: ManualProcessInput['readings']): void {
  if (!Array.isArray(definition) || !definition.length || !readings) throw new ConflictException('La máquina no tiene un formulario manual válido.');
  const fields = definition as ManualFieldDefinition[];
  const expected = new Set(fields.map(({ key }) => key));
  if (expected.size !== fields.length || Object.keys(readings).length !== fields.length || Object.keys(readings).some((key) => !expected.has(key))) {
    throw new ConflictException('Completa exactamente las variables configuradas para esta máquina.');
  }
  for (const field of fields) {
    const value = readings[field.key];
    if ((field.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) ||
        (field.type === 'boolean' && typeof value !== 'boolean') || (field.type === 'text' && typeof value !== 'string')) {
      throw new ConflictException('Tipo incorrecto en la variable ' + field.label + '.');
    }
  }
}
@Injectable()
export class PrismaManualProcessRepository extends ManualProcessRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async execute(machineId: string, runId: string | undefined, action: ManualAction, input: ManualProcessInput,
    session: SessionRecord, audit: AuditInput): Promise<{ reading: MachineReading; replayed: boolean }> {
    const fingerprint = createHash('sha256').update(canonical({ action, runId: runId ?? null, readings: input.readings ?? null,
      startedAt: input.startedAt ?? null, finishedAt: input.finishedAt ?? null })).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM core.machines WHERE id = ${machineId}::uuid FOR UPDATE`);
      const user = await tx.user.findUnique({ where: { id: session.user.id }, include: { scopes: true, roles: { include: { role: { include: { permissions: true } } } } } });
      const permissions = user?.roles.flatMap((r) => r.role.permissions.map((p) => p.permissionCode)) ?? [];
      if (!user?.isActive || user.mustChangePassword || user.securityVersion !== session.securityVersion ||
          !user.roles.some((r) => ['ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE'].includes(r.roleCode)) ||
          !permissions.includes('process.manual.write') || (action !== 'reading' && !permissions.includes('machine.run.manual.manage'))) {
        throw new ForbiddenException('No tienes permiso para registrar este proceso.');
      }
      const machine = await tx.machine.findFirst({ where: { AND: [{ id: machineId, isActive: true, area: { isActive: true, plant: { isActive: true } } },
        scopeFilters({ scopes: user.scopes, permissions }).machine] } });
      if (!machine) throw new NotFoundException('Máquina inactiva, inexistente o fuera de tu acceso.');
      const identity = { userId: user.id, machineId, key: input.idempotencyKey };
      const prior = await tx.manualOperation.findUnique({ where: { userId_machineId_key: identity } });
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new ConflictException('La clave de reintento ya corresponde a otros datos.');
        return { reading: prior.response as unknown as MachineReading, replayed: true };
      }
      const now = new Date(); const eventId = randomUUID();
      let run = await tx.machineRun.findFirst({ where: { machineId, finishedAt: null }, include: runInclude });
      if (action === 'start') {
        const complete = input.startedAt !== undefined && input.finishedAt !== undefined;
        if (complete) {
          if (machine.registrationMode !== 'MANUAL') throw new ConflictException('Esta máquina está configurada para registro automático.');
          const startedAt = new Date(input.startedAt!); const finishedAt = new Date(input.finishedAt!);
          if (!(finishedAt > startedAt)) throw new ConflictException('La parada debe ser posterior al inicio.');
          if (finishedAt.getTime() > now.getTime() + 60000) throw new ConflictException('La parada no puede estar en el futuro.');
          if (await tx.machineRun.findFirst({ where: { machineId, startedAt: { lt: finishedAt }, OR: [{ finishedAt: null }, { finishedAt: { gt: startedAt } }] } })) {
            throw new ConflictException('El control se solapa con otro registro de horas de esta máquina.');
          }
          run = await tx.machineRun.create({ data: { machineId, origin: 'MANUAL', startedAt, finishedAt,
            lastHeartbeatAt: startedAt, observerId: randomUUID(), startedById: user.id, closedById: user.id }, include: runInclude });
        } else {
          if (machine.registrationMode === 'MANUAL') throw new ConflictException('Primero completa fecha y hora de inicio y parada.');
          if (run) throw new ConflictException('Ya existe un control abierto. Actualiza la pantalla.');
          if (await tx.machineRun.findFirst({ where: { machineId, finishedAt: { gt: now } } })) {
            throw new ConflictException('El último control tiene una hora futura. Revisa el reloj de la fuente antes de iniciar.');
          }
          run = await tx.machineRun.create({ data: { machineId, origin: 'MANUAL', startedAt: now, lastHeartbeatAt: now,
            observerId: randomUUID(), startedById: user.id }, include: runInclude });
        }
      } else if (action === 'reading' && machine.registrationMode === 'MANUAL') {
        run = await tx.machineRun.findFirst({ where: { id: runId!, machineId, origin: 'MANUAL', finishedAt: { not: null } }, include: runInclude });
        if (!run) throw new ConflictException('Primero registra un control de horas válido para esta máquina.');
        if (await tx.processData.findFirst({ where: { machineRunId: run.id, sourceType: 'MANUAL' } })) throw new ConflictException('Este control ya tiene su registro de parámetros.');
        validateTemplate(machine.manualFormDefinition, input.readings);
      } else {
        if (!run || run.id !== runId || run.origin !== 'MANUAL') throw new ConflictException('El control manual ya no está abierto o no corresponde a esta máquina.');
        if (action === 'close') run = await tx.machineRun.update({ where: { id: run.id },
          data: { finishedAt: now, closedById: user.id }, include: runInclude });
      }
      if (!run) throw new ConflictException('No existe un control abierto.');
      if (input.readings) await tx.processData.create({ data: { machineId, machineRunId: run.id, eventId, eventTime: now,
        receivedAt: now, sourceType: 'MANUAL', recordedById: user.id, readings: input.readings as Prisma.InputJsonObject } });
      const response: MachineReading = { machineId, eventId, eventTime: now.toISOString(), receivedAt: now.toISOString(),
        readings: input.readings ?? {}, sourceType: 'MANUAL',
        responsible: { id: user.id, username: user.username, name: user.name }, running: null,
        persisted: !!input.readings, run: { ...runView(run), readingCount: input.readings ? 1 : 0 } };
      await tx.auditEvent.create({ data: { ...audit, metadata: { runId: run.id, operation: action, eventId,
        variables: Object.keys(input.readings ?? {}), origin: 'MANUAL' } } });
      await tx.manualOperation.create({ data: { ...identity, fingerprint, response: JSON.parse(JSON.stringify(response)) as Prisma.InputJsonObject } });
      return { reading: response, replayed: false };
    });
  }
}
