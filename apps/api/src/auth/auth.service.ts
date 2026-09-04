import { BadRequestException, HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { AuthRepository } from './auth.repository.js';
import { PasswordService } from './password.service.js';
import { sessionIsValid, sessionView, PASSWORD_MIN, PASSWORD_MAX } from './auth.policy.js';
import type { AuditInput, RequestContext, SessionRecord } from './auth.types.js';

export function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
@Injectable()
export class AuthService {
  constructor(private readonly repository: AuthRepository, private readonly passwords: PasswordService) {}

  event(context: RequestContext, action: string, result: 'SUCCESS' | 'DENIED', reason: string, session?: SessionRecord): AuditInput {
    return {
      ...context, actor: session?.user.username ?? 'anonymous',
      ...(session ? { userId: session.user.id, resourceId: session.user.id } : {}),
      action, result, reason, resourceType: 'USER',
    };
  }
  async login(username: string, password: string, context: RequestContext) {
    const now = new Date();
    const window = Math.floor(now.getTime() / 900000);
    const allowed = await this.repository.takeLoginAttempt([
      tokenDigest('user:' + username + ':' + window),
      tokenDigest('ip:' + context.sourceIp + ':' + window),
    ], new Date((window + 1) * 900000));
    if (!allowed) {
      await this.repository.audit(this.event(context, 'auth.login', 'DENIED', 'RATE_LIMIT'));
      throw new HttpException('Demasiados intentos. Intenta de nuevo más tarde.', 429);
    }
    const user = await this.repository.findAccount(username);
    const verified = await this.passwords.verify(password, user?.passwordHash ?? '');
    if (!verified || !user?.isActive) {
      await this.repository.audit({ ...this.event(context, 'auth.login', 'DENIED', 'INVALID_CREDENTIALS'), actor: username });
      throw new UnauthorizedException('Usuario o contraseña incorrectos.');
    }
    const token = randomBytes(32).toString('hex');
    await this.repository.issueSession(user, tokenDigest(token), new Date(), {
      ...this.event(context, 'auth.login', 'SUCCESS', 'AUTHENTICATED'),
      actor: user.username, userId: user.id, resourceId: user.id,
    });
    return { token, session: sessionView(await this.authenticate(token)) };
  }
  async authenticate(token: string | undefined): Promise<SessionRecord> {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Inicia sesión.');
    const session = await this.repository.findSession(tokenDigest(token));
    if (!session || !sessionIsValid(session, new Date())) {
      throw new UnauthorizedException('La sesión terminó. Inicia sesión nuevamente.');
    }
    return session;
  }
  async activity(session: SessionRecord) {
    if (!await this.repository.activity(session, new Date())) throw new UnauthorizedException();
    const next = await this.repository.findSession(session.tokenHash);
    if (!next || !sessionIsValid(next, new Date())) throw new UnauthorizedException();
    return sessionView(next);
  }
  async changePassword(session: SessionRecord, currentPassword: string, newPassword: string, context: RequestContext) {
    try { this.passwords.validate(newPassword); } catch {
      throw new BadRequestException(`Usa entre ${PASSWORD_MIN} y ${PASSWORD_MAX} caracteres.`);
    }
    if (newPassword === currentPassword) throw new BadRequestException('La nueva contraseña debe ser diferente.');
    // Reuse the persisted account/IP limiter for sensitive password verification.
    const window = Math.floor(Date.now() / 900000);
    if (!await this.repository.takeLoginAttempt([
      tokenDigest('change:' + session.user.id + ':' + window),
      tokenDigest('change-ip:' + context.sourceIp + ':' + window),
    ], new Date((window + 1) * 900000))) throw new HttpException('Demasiados intentos.', 429);
    if (!await this.passwords.verify(currentPassword, session.user.passwordHash)) {
      await this.repository.audit(this.event(context, 'auth.password.change', 'DENIED', 'INVALID_PASSWORD', session));
      throw new UnauthorizedException('Contraseña actual incorrecta.');
    }
    const hash = await this.passwords.hash(newPassword);
    const token = randomBytes(32).toString('hex');
    await this.repository.changePassword(session, hash, tokenDigest(token), new Date(),
      this.event(context, 'auth.password.change', 'SUCCESS', 'PASSWORD_CHANGED', session));
    return { token, session: sessionView(await this.authenticate(token)) };
  }
  async logout(session: SessionRecord, context: RequestContext): Promise<void> {
    await this.repository.revokeSession(session.tokenHash,
      this.event(context, 'auth.logout', 'SUCCESS', 'LOGOUT', session));
  }
  async denied(context: RequestContext, reason: string, session?: SessionRecord): Promise<void> {
    await this.repository.audit(this.event(context, 'auth.authorization', 'DENIED', reason, session));
  }
}
