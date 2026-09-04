import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service.js';
import { BrowserSecurityService } from './browser-security.service.js';
import { contextFor, cookieToken } from './auth.http.js';
import type { AuthRequest, AuthResponse } from './auth.http.js';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService,
    private readonly browser: BrowserSecurityService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const response = context.switchToHttp().getResponse<AuthResponse>();
    const auditContext = contextFor(request);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Correlation-Id', auditContext.correlationId);
    const metadata = [context.getHandler(), context.getClass()];
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      if (!this.browser.allows(typeof request.headers.origin === 'string' ? request.headers.origin : undefined) ||
          request.headers['x-iot-request'] !== '1') {
        await this.auth.denied(auditContext, 'UNTRUSTED_ORIGIN');
        throw new ForbiddenException('Origen no autorizado.');
      }
    }
    if (this.reflector.getAllAndOverride<boolean>('auth:public', metadata)) return true;
    try {
      request.session = await this.auth.authenticate(
        cookieToken(typeof request.headers.cookie === 'string' ? request.headers.cookie : undefined));
    } catch (error) {
      await this.auth.denied(auditContext, 'INVALID_SESSION');
      throw error;
    }
    if (request.session.user.mustChangePassword &&
        !this.reflector.getAllAndOverride<boolean>('auth:password-change', metadata)) {
      await this.auth.denied(auditContext, 'PASSWORD_CHANGE_REQUIRED', request.session);
      throw new ForbiddenException('PASSWORD_CHANGE_REQUIRED');
    }
    const permission = this.reflector.getAllAndOverride<string>('auth:permission', metadata);
    if (permission && !request.session.user.permissions.includes(permission)) {
      await this.auth.denied(auditContext, 'MISSING_PERMISSION', request.session);
      throw new ForbiddenException('No tienes permiso para esta operación.');
    }
    return true;
  }
}

