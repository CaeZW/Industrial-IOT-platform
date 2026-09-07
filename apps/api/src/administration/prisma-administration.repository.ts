import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminOptions, EquipmentSetting, ScopeOption } from '@industrial-iot-platform/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { AuditInput } from '../auth/auth.types.js';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import { scopeFilters } from '../catalog/prisma-scope-filters.js';
import { AdministrationRepository } from './administration.repository.js';

@Injectable()
export class PrismaAdministrationRepository extends AdministrationRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async options(): Promise<AdminOptions> {
    const [roles, permissions, plants, areas, machines, devices] = await Promise.all([
      this.prisma.role.findMany({ include: { permissions: true }, orderBy: { name: 'asc' } }),
      this.prisma.permission.findMany({ orderBy: { code: 'asc' } }),
      this.prisma.plant.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.area.findMany({ include: { plant: true }, orderBy: { name: 'asc' } }),
      this.prisma.machine.findMany({ include: { area: true }, orderBy: { name: 'asc' } }),
      this.prisma.device.findMany({ include: { area: true }, orderBy: { name: 'asc' } }),
    ]);
    const scopes: ScopeOption[] = [
      ...plants.map((p) => ({ type: 'PLANT' as const, resourceId: p.id, value: 'PLANT:' + p.code, label: 'Planta · ' + p.name })),
      ...areas.map((a) => ({ type: 'AREA' as const, resourceId: a.id, value: 'AREA:' + a.code, label: 'Área · ' + a.name + ' · ' + a.plant.name })),
      ...machines.filter((m) => m.code).map((m) => ({ type: 'MACHINE' as const, resourceId: m.id, value: 'MACHINE:' + m.code, label: 'Máquina · ' + m.name + ' · ' + m.area.name })),
      ...devices.filter((d) => d.code).map((d) => ({ type: 'DEVICE' as const, resourceId: d.id, value: 'DEVICE:' + d.code, label: 'Device · ' + d.name + ' · ' + d.area.name })),
    ];
    return { roles: roles.map((r) => ({ code: r.code, name: r.name, permissions: r.permissions.map((p) => p.permissionCode) })),
      permissions: permissions.map((p) => p.code), scopes };
  }
  private filters(access: CatalogAccess) {
    // Configuration permission is checked by the API; resource scope is independent of catalog-view permissions.
    return scopeFilters({ ...access, permissions: ['page.machines.view', 'page.devices.view'] });
  }
  async settings(access: CatalogAccess): Promise<EquipmentSetting[]> {
    const filters = this.filters(access);
    const [machines, devices] = await Promise.all([
      this.prisma.machine.findMany({ where: filters.machine, include: { area: true }, orderBy: { name: 'asc' } }),
      this.prisma.device.findMany({ where: filters.device, include: { area: true }, orderBy: { name: 'asc' } }),
    ]);
    return [
      ...machines.map((m) => ({ id: m.id, kind: 'machine' as const, name: m.name, code: m.code, area: m.area.name,
        persistenceIntervalSeconds: m.persistenceIntervalSeconds, runningKey: m.runningKey })),
      ...devices.map((d) => ({ id: d.id, kind: 'device' as const, name: d.name, code: d.code, area: d.area.name,
        persistenceIntervalSeconds: d.persistenceIntervalSeconds, runningKey: null })),
    ];
  }
  async updateSetting(kind: 'machine' | 'device', id: string, interval: number,
    runningKey: string | undefined, access: CatalogAccess, audit: AuditInput): Promise<void> {
    const filters = this.filters(access);
    await this.prisma.$transaction(async (tx) => {
      const previous = kind === 'machine'
        ? await tx.machine.findFirst({ where: { AND: [{ id }, filters.machine] } })
        : await tx.device.findFirst({ where: { AND: [{ id }, filters.device] } });
      if (!previous) throw new NotFoundException('Equipo inexistente o fuera de tu acceso.');
      if (kind === 'machine') await tx.machine.update({ where: { id }, data: { persistenceIntervalSeconds: interval, runningKey: runningKey! } });
      else await tx.device.update({ where: { id }, data: { persistenceIntervalSeconds: interval } });
      await tx.auditEvent.create({ data: { ...audit, metadata: {
        previousIntervalSeconds: String(previous.persistenceIntervalSeconds), intervalSeconds: String(interval),
        ...(kind === 'machine' && 'runningKey' in previous ? { previousRunningKey: String(previous.runningKey), runningKey: runningKey! } : {}),
      } } });
    }, { isolationLevel: 'Serializable' });
  }
}
