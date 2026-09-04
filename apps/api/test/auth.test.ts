import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ConfigService } from '@nestjs/config';
import { sessionIsValid, sessionView, IDLE_MS, SESSION_MS } from '../src/auth/auth.policy.js';
import { PasswordService } from '../src/auth/password.service.js';
import { BrowserSecurityService } from '../src/auth/browser-security.service.js';
import { cookieToken } from '../src/auth/auth.http.js';
import type { SessionRecord } from '../src/auth/auth.types.js';
import { initialUsers, initialRoles, defaultScopeCodes } from '../src/users/initial-policy.js';
import { canRemoveAdministrator } from '../src/users/administration.policy.js';
import { ChangePasswordDto } from '../src/auth/auth.controller.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PASSWORD_MIN, PASSWORD_MAX } from '../src/auth/auth.policy.js';

const now = new Date('2026-09-04T12:00:00Z');
const session: SessionRecord = {
  tokenHash: 'not-a-real-token', securityVersion: 0,
  expiresAt: new Date(now.getTime() + SESSION_MS), lastActivityAt: now,
  user: { id: 'user', username: 'test', name: 'Test', roles: [], scopes: [],
    permissions: [], mustChangePassword: false, passwordHash: 'private',
    isActive: true, securityVersion: 0 },
};
describe('session policy', () => {
  it('enforces the exact idle and absolute expiration boundaries', () => {
    assert.equal(sessionIsValid(session, new Date(now.getTime() + IDLE_MS - 1)), true);
    assert.equal(sessionIsValid(session, new Date(now.getTime() + IDLE_MS)), false);
    assert.equal(sessionIsValid({ ...session, lastActivityAt: new Date(now.getTime() + SESSION_MS - 1) },
      new Date(now.getTime() + SESSION_MS)), false);
  });
  it('rejects inactive accounts and invalidated security versions', () => {
    assert.equal(sessionIsValid({ ...session, user: { ...session.user, isActive: false } }, now), false);
    assert.equal(sessionIsValid({ ...session, securityVersion: 1 }, now), false);
  });
  it('never exposes password hashes or session tokens in the browser contract', () => {
    const view = JSON.stringify(sessionView(session));
    assert.equal(view.includes('private'), false);
    assert.equal(view.includes('tokenHash'), false);
    assert.equal(view.includes('securityVersion'), false);
  });
  it('rejects ambiguous cookies', () => {
    assert.equal(cookieToken('a=1; iot_session=abc'), 'abc');
    assert.equal(cookieToken('iot_session=a; iot_session=b'), undefined);
  });
});
describe('password protection', () => {
  it('uses the configured limits in the service, DTO and browser session contract', async () => {
    const passwords = new PasswordService();
    assert.equal(PASSWORD_MIN, 8);
    for (const length of [PASSWORD_MIN, PASSWORD_MAX]) {
      const value = 'x'.repeat(length);
      assert.doesNotThrow(() => passwords.validate(value));
      assert.equal((await validate(plainToInstance(ChangePasswordDto, { currentPassword: 'old', newPassword: value }))).length, 0);
    }
    for (const length of [PASSWORD_MIN - 1, PASSWORD_MAX + 1]) {
      const value = 'x'.repeat(length);
      assert.throws(() => passwords.validate(value));
      assert.ok((await validate(plainToInstance(ChangePasswordDto, { currentPassword: 'old', newPassword: value }))).length > 0);
    }
    assert.deepEqual(sessionView(session).passwordPolicy, { minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX });
  });
  it('salts and verifies using the same bounded KDF for invalid accounts', async () => {
    const passwords = new PasswordService();
    const first = await passwords.hash('test-only-long-password');
    const second = await passwords.hash('test-only-long-password');
    assert.notEqual(first, second);
    assert.equal(await passwords.verify('test-only-long-password', first), true);
    assert.equal(await passwords.verify('wrong', first), false);
    assert.equal(await passwords.verify('wrong', ''), false);
    assert.throws(() => passwords.validate('short'));
    assert.throws(() => passwords.validate('x'.repeat(129)));
  });
});
describe('browser boundary and initial policy', () => {
  it('preserves the last active administrator', () => {
    assert.equal(canRemoveAdministrator(true, true, 1), false);
    assert.equal(canRemoveAdministrator(true, true, 2), true);
    assert.equal(canRemoveAdministrator(false, true, 1), true);
    assert.equal(canRemoveAdministrator(true, false, 1), true);
  });
  it('allows only configured origins and requires TLS off loopback', () => {
    const config = new ConfigService({ WEB_HOST: '127.0.0.1', WEB_PORT: 4200, API_HOST: '127.0.0.1' });
    const policy = new BrowserSecurityService(config);
    assert.equal(policy.allows('http://127.0.0.1:4200'), true);
    assert.equal(policy.allows('http://localhost:4200'), true);
    assert.equal(policy.allows('http://evil.example'), false);
    assert.equal(policy.allows(undefined), false);
    assert.throws(() => new BrowserSecurityService(new ConfigService({
      WEB_HOST: 'plant.local', WEB_PORT: 80, API_HOST: '0.0.0.0',
    })));
  });
  it('contains 13 unique identities and preserves the agreed roles and scopes', () => {
    assert.equal(initialUsers.length, 13);
    assert.equal(new Set(initialUsers.map(({ username }) => username)).size, 13);
    assert.equal(initialUsers.find(({ username }) => username === 'dchoque')?.email, 'mchoque@grupoalcos.com');
    assert.deepEqual(defaultScopeCodes('SUPERVISOR'), ['PLANT:ALCOS-EL-ALTO']);
    assert.equal(defaultScopeCodes('QUALITY_CONTROL').length, 11);
    assert.equal(defaultScopeCodes('QUALITY_CONTROL').includes('AREA:MANTENIMIENTO'), false);
    assert.equal(defaultScopeCodes('QUALITY_CONTROL').includes('AREA:ESTABILIDAD'), true);
    assert.equal(initialRoles.find(({ code }) => code === 'OPERATOR')?.permissions.includes('machine.control' as never), false);
  });
});
