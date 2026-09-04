import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AuthRepository } from './auth.repository.js';
import type { Account, AuditInput, SessionRecord } from './auth.types.js';
import { IDLE_MS, SESSION_MS } from './auth.policy.js';

const accountInclude = {
  roles: { include: { role: { include: { permissions: true } } } },
  scopes: true,
} as const;
type UserRecord = Prisma.UserGetPayload<{ include: typeof accountInclude }>;

function account(user: UserRecord): Account {
  return {
    id: user.id, username: user.username, name: user.name,
    passwordHash: user.passwordHash, isActive: user.isActive,
    mustChangePassword: user.mustChangePassword, securityVersion: user.securityVersion,
    roles: user.roles.map(({ roleCode }) => roleCode),
    permissions: [...new Set(user.roles.flatMap(({ role }) =>
      role.permissions.map(({ permissionCode }) => permissionCode)))],
    scopes: user.scopes.map(({ type, resourceId }) => ({ type, resourceId })),
  };
}

@Injectable()
export class PrismaAuthRepository extends AuthRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findAccount(username: string): Promise<Account | null> {
    const user = await this.prisma.user.findUnique({ where: { username }, include: accountInclude });
    return user ? account(user) : null;
  }
  async findSession(tokenHash: string): Promise<SessionRecord | null> {
    const row = await this.prisma.session.findUnique({
      where: { tokenHash }, include: { user: { include: accountInclude } },
    });
    return row ? { ...row, user: account(row.user) } : null;
  }
  async issueSession(user: Account, tokenHash: string, now: Date, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update locks the account against concurrent reset/disable operations.
      const locked = await tx.user.updateMany({
        where: { id: user.id, securityVersion: user.securityVersion, isActive: true },
        data: { updatedAt: now },
      });
      if (locked.count !== 1) throw new UnauthorizedException('Credenciales no válidas.');
      await tx.session.deleteMany({ where: { expiresAt: { lte: now } } });
      await tx.session.create({ data: {
        tokenHash, userId: user.id, securityVersion: user.securityVersion,
        createdAt: now, lastActivityAt: now, expiresAt: new Date(now.getTime() + SESSION_MS),
      } });
      await tx.auditEvent.create({ data: audit });
    });
  }
  async changePassword(session: SessionRecord, passwordHash: string, nextTokenHash: string, now: Date, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const locked = await tx.user.updateMany({
        where: { id: session.user.id, securityVersion: session.securityVersion, isActive: true },
        data: { passwordHash, mustChangePassword: false, securityVersion: { increment: 1 } },
      });
      if (locked.count !== 1) throw new UnauthorizedException();
      const current = await tx.session.findFirst({ where: {
        tokenHash: session.tokenHash, expiresAt: { gt: now },
        lastActivityAt: { gt: new Date(now.getTime() - IDLE_MS) },
      } });
      if (!current) throw new UnauthorizedException();
      await tx.session.deleteMany({ where: { userId: session.user.id } });
      await tx.session.create({ data: {
        tokenHash: nextTokenHash, userId: session.user.id,
        securityVersion: session.securityVersion + 1,
        expiresAt: session.expiresAt, lastActivityAt: now,
      } });
      await tx.auditEvent.create({ data: audit });
    });
  }
  async revokeSession(tokenHash: string, audit: AuditInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { tokenHash } }),
      this.prisma.auditEvent.create({ data: audit }),
    ]);
  }
  async activity(session: SessionRecord, now: Date): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: {
        tokenHash: session.tokenHash, expiresAt: { gt: now },
        lastActivityAt: { gt: new Date(now.getTime() - IDLE_MS) },
        user: { isActive: true, securityVersion: session.securityVersion },
      },
      data: { lastActivityAt: now },
    });
    return result.count === 1;
  }
  async takeLoginAttempt(keys: readonly string[], expiresAt: Date): Promise<boolean> {
    await this.prisma.loginWindow.deleteMany({ where: { expiresAt: { lte: new Date() } } });
    const rows = await this.prisma.$transaction(keys.map((key) =>
      this.prisma.loginWindow.upsert({
        where: { key }, create: { key, expiresAt, attempts: 1 },
        update: { attempts: { increment: 1 } },
      })));
    return rows.every((row, index) => row.attempts <= (index === 0 ? 10 : 40));
  }
  async audit(event: AuditInput): Promise<void> {
    await this.prisma.auditEvent.create({ data: event });
  }
}

