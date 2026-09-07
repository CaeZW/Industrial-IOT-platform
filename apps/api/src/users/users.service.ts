import { BadRequestException, Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { randomBytes, randomUUID } from 'node:crypto';
import { PasswordService } from '../auth/password.service.js';
import { AuthRepository } from '../auth/auth.repository.js';
import type { AuditInput } from '../auth/auth.types.js';
import { defaultScopeCodes, initialRoles, initialUsers } from './initial-policy.js';
import { UsersRepository } from './users.repository.js';
import type { UserInput } from './users.repository.js';

export interface TemporaryCredential {
  readonly username: string;
  readonly password: string;
}
export type DeliverCredentials = (credentials: readonly TemporaryCredential[]) => Promise<void>;
export type AdministrationActor = string | Pick<AuditInput, 'actor' | 'userId' | 'sourceIp' | 'userAgent' | 'correlationId'>;

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository, private readonly passwords: PasswordService,
    private readonly audit: AuthRepository) {}
  private event(actor: AdministrationActor, action: string, target?: string): AuditInput {
    const identity = typeof actor === 'string' ? { actor: actor.slice(0, 160), correlationId: randomUUID() } : actor;
    return { ...identity, action, result: 'SUCCESS', reason: typeof actor === 'string' ? 'LOCAL_ADMINISTRATION' : 'HTTP_ADMINISTRATION',
      resourceType: 'USER', ...(target ? { resourceId: target } : {}) };
  }
  private async run<T>(actor: AdministrationActor, action: string, target: string | undefined,
    work: (event: AuditInput) => Promise<T>): Promise<T> {
    const event = this.event(actor, action, target);
    try { return await work(event); } catch (error) {
      await this.audit.audit({ ...event, result: 'DENIED', reason: 'ADMINISTRATION_REJECTED' });
      throw error;
    }
  }
  private validate(input: UserInput): void {
    if (!/^[a-z0-9._-]{2,64}$/.test(input.username) || input.name.trim().length < 2 || input.name.length > 160) {
      throw new BadRequestException('Nombre o username inválido.');
    }
    if (input.email !== null && (input.email.length > 254 || !isEmail(input.email))) {
      throw new BadRequestException('Correo inválido.');
    }
    this.validateRole(input.role);
  }
  private validateRole(role: string): void {
    if (!initialRoles.some((entry) => entry.code === role)) throw new BadRequestException('Rol desconocido.');
  }
  async initialize(actor: string, deliver: DeliverCredentials): Promise<number> {
    return this.run(actor, 'users.initialize', undefined, async (event) => {
      await this.repository.initializePolicy(event);
      const existing = new Set((await this.repository.list()).map(({ username }) => username));
      const missing = initialUsers.filter(({ username }) => !existing.has(username));
      if (!missing.length) return 0;
      const credentials = missing.map(({ username }) => ({ username, password: randomBytes(24).toString('base64url') }));
      const prepared = [];
      for (const [index, user] of missing.entries()) {
        prepared.push({
          ...user, passwordHash: await this.passwords.hash(credentials[index]!.password),
          scopes: await this.repository.resolveScopes(defaultScopeCodes(user.role)),
        });
      }
      // Delivery must succeed before provisioning; never lose generated passwords.
      await deliver(credentials);
      for (const user of prepared) await this.repository.create(user, this.event(actor, 'user.create'));
      return prepared.length;
    });
  }
  async create(input: UserInput, scopeCodes: readonly string[], actor: AdministrationActor, deliver: DeliverCredentials): Promise<void> {
    await this.run(actor, 'user.create', input.username, async (event) => {
      this.validate(input);
      if ((await this.repository.list()).some(({ username }) => username === input.username)) {
        throw new BadRequestException('Username ya registrado.');
      }
      const scopes = await this.repository.resolveScopes(scopeCodes);
      const password = randomBytes(24).toString('base64url');
      const passwordHash = await this.passwords.hash(password);
      await deliver([{ username: input.username, password }]);
      await this.repository.create({ ...input, scopes, passwordHash }, event);
    });
  }
  list(actor: AdministrationActor) {
    return this.run(actor, 'users.list', undefined, async (event) => {
      await this.audit.audit(event);
      return this.repository.list();
    });
  }
  setActive(username: string, active: boolean, actor: AdministrationActor) {
    return this.run(actor, active ? 'user.activate' : 'user.deactivate', username,
      (event) => this.repository.setActive(username, active, event));
  }
  resetPassword(username: string, actor: AdministrationActor, deliver: DeliverCredentials) {
    return this.run(actor, 'user.password.reset', username, async (event) => {
      if (!(await this.repository.list()).some((user) => user.username === username)) {
        throw new BadRequestException('Usuario inexistente.');
      }
      const password = randomBytes(24).toString('base64url');
      const hash = await this.passwords.hash(password);
      await deliver([{ username, password }]);
      await this.repository.resetPassword(username, hash, event);
    });
  }
  setAccess(username: string, role: string, scopes: readonly string[], actor: AdministrationActor) {
    return this.run(actor, 'user.access.change', username, async (event) => {
      this.validateRole(role);
      await this.repository.setAccess(username, role, await this.repository.resolveScopes(scopes), event);
    });
  }
  setPermissions(role: string, permissions: readonly string[], actor: AdministrationActor) {
    return this.run(actor, 'role.permissions.change', role,
      (event) => this.repository.setPermissions(role, permissions, event));
  }
  auditEvents(actor: string) {
    return this.run(actor, 'audit.read', undefined, async (event) => {
      await this.audit.audit(event);
      return this.repository.auditEvents();
    });
  }
}
