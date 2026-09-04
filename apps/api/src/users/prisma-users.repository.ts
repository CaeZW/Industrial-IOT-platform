import { BadRequestException, Injectable } from '@nestjs/common';
import type { ResourceScope } from '@industrial-iot-platform/contracts';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { AuditInput } from '../auth/auth.types.js';
import { initialRoles } from './initial-policy.js';
import { canRemoveAdministrator } from './administration.policy.js';
import { UsersRepository } from './users.repository.js';
import type { ProvisionUser, UserSummary } from './users.repository.js';

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async initializePolicy(audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const role of initialRoles) {
        for (const code of role.permissions) {
          await tx.permission.upsert({ where: { code }, create: { code }, update: {} });
        }
        // Create-only: subsequent initialization must not undo explicit policy edits.
        await tx.role.upsert({
          where: { code: role.code }, update: {},
          create: { code: role.code, name: role.name, permissions: {
            create: role.permissions.map((permissionCode) => ({ permissionCode })),
          } },
        });
      }
      await tx.auditEvent.create({ data: audit });
    });
  }
  async list(): Promise<UserSummary[]> {
    const rows = await this.prisma.user.findMany({
      select: { username: true, name: true, email: true, isActive: true,
        mustChangePassword: true, roles: true, scopes: true },
      orderBy: { username: 'asc' },
    });
    return rows.map(({ roles, scopes, ...row }) => ({
      ...row, role: roles.map(({ roleCode }) => roleCode).join(','),
      scopes: scopes.map(({ type, resourceId }) => ({ type, resourceId })),
    }));
  }
  async resolveScopes(values: readonly string[]): Promise<ResourceScope[]> {
    const result: ResourceScope[] = [];
    for (const value of values) {
      const [type, code, extra] = value.split(':');
      if (!code || extra !== undefined) throw new BadRequestException('Usa TIPO:CODIGO para cada alcance.');
      let id: string | undefined;
      if (type === 'PLANT') id = (await this.prisma.plant.findUnique({ where: { code } }))?.id;
      else if (type === 'AREA') {
        const matches = await this.prisma.area.findMany({ where: { code }, take: 2 });
        if (matches.length === 1) id = matches[0]!.id;
      } else if (type === 'MACHINE') id = (await this.prisma.machine.findUnique({ where: { code } }))?.id;
      else if (type === 'DEVICE') id = (await this.prisma.device.findUnique({ where: { code } }))?.id;
      else throw new BadRequestException('Tipo de alcance desconocido.');
      if (!id) throw new BadRequestException('Recurso inexistente o ambiguo: ' + value);
      if (!result.some((scope) => scope.type === type && scope.resourceId === id)) {
        result.push({ type, resourceId: id });
      }
    }
    return result;
  }
  async create(input: ProvisionUser, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: {
        username: input.username, name: input.name, email: input.email,
        passwordHash: input.passwordHash, isActive: true, mustChangePassword: true,
        roles: { create: { roleCode: input.role } },
        scopes: { create: input.scopes.map((scope) => ({ ...scope })) },
      } });
      await tx.auditEvent.create({ data: { ...audit, resourceId: user.id,
        metadata: { role: input.role, scopes: input.scopes.map((scope) => scope.type + ':' + scope.resourceId), active: true } } });
    });
  }
  private async target(tx: Prisma.TransactionClient, username: string, removingAdmin: boolean) {
    const user = await tx.user.findUnique({ where: { username }, include: { roles: true } });
    if (!user) throw new BadRequestException('Usuario inexistente.');
    if (removingAdmin && user.isActive && user.roles.some(({ roleCode }) => roleCode === 'ADMINISTRATOR')) {
      const count = await tx.user.count({ where: { isActive: true, roles: { some: { roleCode: 'ADMINISTRATOR' } } } });
      if (!canRemoveAdministrator(user.isActive, true, count)) throw new BadRequestException('No se puede quitar el último administrador activo.');
    }
    return user;
  }
  async setActive(username: string, isActive: boolean, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.target(tx, username, !isActive);
      await tx.user.update({ where: { id: user.id }, data: { isActive, securityVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditEvent.create({ data: { ...audit, resourceId: user.id, metadata: { previousActive: user.isActive, active: isActive } } });
    }, { isolationLevel: 'Serializable' });
  }
  async resetPassword(username: string, passwordHash: string, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.target(tx, username, false);
      await tx.user.update({ where: { id: user.id },
        data: { passwordHash, mustChangePassword: true, securityVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditEvent.create({ data: { ...audit, resourceId: user.id } });
    });
  }
  async setAccess(username: string, role: string, scopes: readonly ResourceScope[], audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await this.target(tx, username, role !== 'ADMINISTRATOR');
      await tx.user.update({ where: { id: user.id }, data: { securityVersion: { increment: 1 } } });
      await tx.userRole.deleteMany({ where: { userId: user.id } });
      await tx.userRole.create({ data: { userId: user.id, roleCode: role } });
      await tx.userScope.deleteMany({ where: { userId: user.id } });
      await tx.userScope.createMany({ data: scopes.map((scope) => ({ ...scope, userId: user.id })) });
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.auditEvent.create({ data: { ...audit, resourceId: user.id,
        metadata: { previousRoles: user.roles.map(({ roleCode }) => roleCode), role,
          scopes: scopes.map((scope) => scope.type + ':' + scope.resourceId) } } });
    }, { isolationLevel: 'Serializable' });
  }
  async setPermissions(role: string, permissions: readonly string[], audit: AuditInput): Promise<void> {
    if (role === 'ADMINISTRATOR') throw new BadRequestException('La política de recuperación del administrador se conserva.');
    const known = await this.prisma.permission.count({ where: { code: { in: [...permissions] } } });
    if (known !== new Set(permissions).size) throw new BadRequestException('Permiso desconocido.');
    await this.prisma.$transaction(async (tx) => {
      if (!await tx.role.findUnique({ where: { code: role } })) throw new BadRequestException('Rol desconocido.');
      await tx.rolePermission.deleteMany({ where: { roleCode: role } });
      await tx.rolePermission.createMany({ data: [...new Set(permissions)].map((permissionCode) => ({ roleCode: role, permissionCode })) });
      const users = await tx.user.findMany({ where: { roles: { some: { roleCode: role } } }, select: { id: true } });
      const ids = users.map(({ id }) => id);
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { securityVersion: { increment: 1 } } });
      await tx.session.deleteMany({ where: { userId: { in: ids } } });
      await tx.auditEvent.create({ data: { ...audit, resourceType: 'ROLE', resourceId: role, metadata: { permissions: [...permissions] } } });
    }, { isolationLevel: 'Serializable' });
  }
  async auditEvents(): Promise<readonly object[]> {
    return this.prisma.auditEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 100 });
  }
}
