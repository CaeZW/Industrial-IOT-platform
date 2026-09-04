import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SessionRecord, RequestContext } from './auth.types.js';

export const Public = () => SetMetadata('auth:public', true);
export const AllowPasswordChange = () => SetMetadata('auth:password-change', true);
export const RequirePermission = (permission: string) => SetMetadata('auth:permission', permission);
export const CurrentSession = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SessionRecord => ctx.switchToHttp().getRequest<AuthRequest>().session!,
);
export interface AuthRequest {
  readonly headers: Record<string, string | string[] | undefined>;
  readonly method: string;
  readonly ip?: string;
  session?: SessionRecord;
  authContext?: RequestContext;
}
export interface AuthResponse {
  setHeader(name: string, value: string): void;
}
export function contextFor(request: AuthRequest): RequestContext {
  return request.authContext ??= {
    correlationId: randomUUID(),
    sourceIp: request.ip?.slice(0, 64) ?? 'unknown',
    userAgent: String(request.headers['user-agent'] ?? '').slice(0, 300),
  };
}
export function cookieToken(cookie: string | undefined): string | undefined {
  const matches = cookie?.split(';').map((part) => part.trim())
    .filter((part) => part.startsWith('iot_session='));
  return matches?.length === 1 ? matches[0]!.slice('iot_session='.length) : undefined;
}

