import type { Account, AuditInput, SessionRecord } from './auth.types.js';

export abstract class AuthRepository {
  abstract findAccount(username: string): Promise<Account | null>;
  abstract findSession(tokenHash: string): Promise<SessionRecord | null>;
  abstract issueSession(account: Account, tokenHash: string, now: Date, audit: AuditInput): Promise<void>;
  abstract changePassword(session: SessionRecord, passwordHash: string, nextTokenHash: string, now: Date, audit: AuditInput): Promise<void>;
  abstract revokeSession(tokenHash: string, audit: AuditInput): Promise<void>;
  abstract activity(session: SessionRecord, now: Date): Promise<boolean>;
  abstract takeLoginAttempt(keys: readonly string[], expiresAt: Date): Promise<boolean>;
  abstract audit(event: AuditInput): Promise<void>;
}

