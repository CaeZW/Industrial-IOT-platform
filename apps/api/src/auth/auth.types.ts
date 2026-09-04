import type { AuthUser } from '@industrial-iot-platform/contracts';

export interface Account extends AuthUser {
  readonly passwordHash: string;
  readonly isActive: boolean;
  readonly securityVersion: number;
}
export interface SessionRecord {
  readonly tokenHash: string;
  readonly user: Account;
  readonly securityVersion: number;
  readonly expiresAt: Date;
  readonly lastActivityAt: Date;
}
export interface AuditInput {
  readonly userId?: string;
  readonly actor: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId?: string;
  readonly result: 'SUCCESS' | 'DENIED';
  readonly reason: string;
  readonly sourceIp?: string;
  readonly userAgent?: string;
  readonly correlationId: string;
  readonly metadata?: Record<string, string | boolean | string[]>;
}
export interface RequestContext {
  readonly sourceIp: string;
  readonly userAgent: string;
  readonly correlationId: string;
}
