import type { ResourceScope } from '@industrial-iot-platform/contracts';
import type { AuditInput } from '../auth/auth.types.js';
export interface UserInput {
  readonly name: string;
  readonly username: string;
  readonly email: string | null;
  readonly role: string;
}
export interface ProvisionUser extends UserInput {
  readonly passwordHash: string;
  readonly scopes: readonly ResourceScope[];
}
export interface UserSummary extends UserInput {
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly scopes: readonly ResourceScope[];
}
export abstract class UsersRepository {
  abstract initializePolicy(audit: AuditInput): Promise<void>;
  abstract list(): Promise<UserSummary[]>;
  abstract resolveScopes(values: readonly string[]): Promise<ResourceScope[]>;
  abstract create(input: ProvisionUser, audit: AuditInput): Promise<void>;
  abstract setActive(username: string, active: boolean, audit: AuditInput): Promise<void>;
  abstract resetPassword(username: string, passwordHash: string, audit: AuditInput): Promise<void>;
  abstract setAccess(username: string, role: string, scopes: readonly ResourceScope[], audit: AuditInput): Promise<void>;
  abstract setPermissions(role: string, permissions: readonly string[], audit: AuditInput): Promise<void>;
  abstract auditEvents(): Promise<readonly object[]>;
}

