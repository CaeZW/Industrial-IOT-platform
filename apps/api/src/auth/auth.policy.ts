import type { AuthSession } from "@industrial-iot-platform/contracts";
import type { SessionRecord } from "./auth.types.js";

export const IDLE_MS = 60 * 60 * 1000;
export const SESSION_MS = 8 * IDLE_MS;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export function sessionIsValid(session: SessionRecord, now: Date): boolean {
  return (
    session.user.isActive &&
    session.securityVersion === session.user.securityVersion &&
    session.expiresAt.getTime() > now.getTime() &&
    session.lastActivityAt.getTime() + IDLE_MS > now.getTime()
  );
}
export function sessionView(session: SessionRecord): AuthSession {
  const { user } = session;
  return {
    passwordPolicy: { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX },
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      mustChangePassword: user.mustChangePassword,
      roles: user.roles,
      permissions: user.permissions,
      scopes: user.scopes,
    },
    expiresAt: session.expiresAt.toISOString(),
    idleExpiresAt: new Date(
      Math.min(
        session.expiresAt.getTime(),
        session.lastActivityAt.getTime() + IDLE_MS,
      ),
    ).toISOString(),
  };
}
