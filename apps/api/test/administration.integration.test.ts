import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { config } from 'dotenv';
import type { AdminOptions, AdminUser, EquipmentSetting, TemporaryPassword } from '@industrial-iot-platform/contracts';
import { PrismaService } from '../src/database/prisma.service.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaUsersRepository } from '../src/users/prisma-users.repository.js';

config({ path: '../../.env', quiet: true });
const suffix = randomUUID().slice(0, 8);
const admin = 'adm_' + suffix;
const limited = 'lim_' + suffix;
const target = 'new_' + suffix;
const customRole = 'TEST_ADMIN_' + suffix;
const password = 'disposable-administration-' + suffix;
const origin = 'http://127.0.0.1:4200';
const testIp = '198.18.1.' + (parseInt(suffix.slice(0, 2), 16) % 250 + 1);
let prisma: PrismaService;
let app: INestApplication;
let base = '';
let adminCookie = '';
let limitedCookie = '';
let machineId = '';
let deviceId = '';
let areaId = '';
let adminId = '';
let temporaryPassword = '';
let targetCookie = '';

async function request(path: string, method = 'GET', body?: object, cookie = adminCookie, trusted = true) {
  return fetch(base + '/api/' + path, { method,
    headers: { 'Content-Type': 'application/json', 'X-IOT-Request': '1', 'X-Forwarded-For': testIp,
      Origin: trusted ? origin : 'http://untrusted.invalid', Cookie: cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function login(username: string, secret = password) {
  const response = await request('auth/login', 'POST', { username, password: secret }, '');
  assert.equal(response.status, 200);
  return response.headers.get('set-cookie')!.split(';')[0]!;
}
before(async () => {
  const env = validateEnvironment({ ...process.env });
  assert.ok(['127.0.0.1', 'localhost', '::1'].includes(String(env.POSTGRES_HOST)));
  prisma = new PrismaService(new ConfigService(env));
  const repo = new PrismaUsersRepository(prisma);
  await repo.initializePolicy({ actor: 'test:' + suffix, action: 'test.setup', resourceType: 'TEST', result: 'SUCCESS', reason: 'TEST_FIXTURE', correlationId: randomUUID() });
  const area = await prisma.area.findFirstOrThrow({ where: { code: 'ESTABILIDAD' } });
  areaId = area.id;
  const machine = await prisma.machine.create({ data: { name: 'Disposable machine ' + suffix, code: 'TEST-M-' + suffix, areaId } });
  machineId = machine.id;
  const device = await prisma.device.create({ data: { name: 'Disposable device ' + suffix, code: 'TEST-D-' + suffix, areaId } });
  deviceId = device.id;
  await prisma.role.create({ data: { code: customRole, name: 'Disposable role', permissions: {
    create: ['user.manage', 'role.manage', 'configuration.write'].map((permissionCode) => ({ permissionCode })),
  } } });
  const hash = await new PasswordService().hash(password);
  const adminRow = await prisma.user.create({ data: { username: admin, name: 'Disposable admin', passwordHash: hash, mustChangePassword: false,
    roles: { create: { roleCode: 'ADMINISTRATOR' } }, scopes: { create: { type: 'AREA', resourceId: areaId } } } });
  adminId = adminRow.id;
  await prisma.user.create({ data: { username: limited, name: 'Disposable scoped user', passwordHash: hash, mustChangePassword: false,
    roles: { create: { roleCode: customRole } }, scopes: { create: { type: 'DEVICE', resourceId: deviceId } } } });
  const compiled = await import(new URL('../.tools/app.module.js', import.meta.url).href) as { AppModule: Type<unknown> };
  app = await NestFactory.create(compiled.AppModule, { logger: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  adminCookie = await login(admin); limitedCookie = await login(limited);
});
after(async () => {
  if (app) await app.close();
  if (prisma) {
    await prisma.user.deleteMany({ where: { username: { in: [admin, limited, target] } } });
    await prisma.role.deleteMany({ where: { code: customRole } });
    if (machineId) await prisma.machine.delete({ where: { id: machineId } });
    if (deviceId) await prisma.device.delete({ where: { id: deviceId } });
    await prisma.onModuleDestroy();
  }
});

describe('4A/4B administration HTTP', { concurrency: false }, () => {
  it('requires authentication, administrator identity and trusted mutation origins', async () => {
    assert.equal((await request('administration/users', 'GET', undefined, '')).status, 401);
    assert.equal((await request('administration/users', 'GET', undefined, limitedCookie)).status, 403);
    assert.equal((await request('administration/role-options', 'GET', undefined, limitedCookie)).status, 403);
    assert.equal((await request('administration/users/' + admin + '/active', 'PATCH', { active: true }, adminCookie, false)).status, 403);
  });
  it('lists safe user summaries and actual role grants without credentials', async () => {
    const response = await request('administration/users');
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    const users = await response.json() as AdminUser[];
    assert.ok(users.some((u) => u.username === admin));
    for (const user of users) { assert.ok(!('password' in user)); assert.ok(!('passwordHash' in user)); }
    const options = await (await request('administration/user-options')).json() as AdminOptions;
    assert.ok(options.scopes.some((s) => s.resourceId === machineId));
    assert.ok(options.roles.find((r) => r.code === customRole)?.permissions.includes('configuration.write'));
  });
  it('creates a user and delivers a temporary credential once, enforcing first change', async () => {
    const response = await request('administration/users', 'POST', { username: target, name: 'Disposable target', email: null, role: 'OPERATOR', scopes: ['AREA:ESTABILIDAD'] });
    assert.equal(response.status, 201); assert.equal(response.headers.get('cache-control'), 'no-store');
    const result = await response.json() as TemporaryPassword;
    assert.equal(result.username, target); assert.ok(result.password.length >= 24); temporaryPassword = result.password;
    targetCookie = await login(target, temporaryPassword);
    assert.equal((await request('administration/equipment', 'GET', undefined, targetCookie)).status, 403);
    const changed = await request('auth/password', 'POST', { currentPassword: temporaryPassword, newPassword: password }, targetCookie);
    assert.equal(changed.status, 200); targetCookie = changed.headers.get('set-cookie')!.split(';')[0]!;
    assert.equal((await request('administration/users', 'GET', undefined, targetCookie)).status, 403);
  });
  it('validates inputs without applying partial grants', async () => {
    assert.equal((await request('administration/users/' + target + '/active', 'PATCH', { active: 'false' })).status, 400);
    assert.equal((await request('administration/users/' + target + '/access', 'PATCH', { role: 'SUPERVISOR', scopes: ['AREA:DOES-NOT-EXIST'] })).status, 400);
    assert.equal((await prisma.userRole.findFirstOrThrow({ where: { user: { username: target } } })).roleCode, 'OPERATOR');
    assert.equal((await request('administration/users', 'POST', { username: 'bad space', name: 'Test', role: 'OPERATOR', scopes: [] })).status, 400);
  });
  it('updates roles/scopes, revokes sessions and audits the authenticated actor', async () => {
    assert.equal((await request('administration/users/' + target + '/access', 'PATCH', { role: 'SUPERVISOR', scopes: ['MACHINE:TEST-M-' + suffix] })).status, 200);
    assert.equal((await request('auth/me', 'GET', undefined, targetCookie)).status, 401);
    const user = await prisma.user.findUniqueOrThrow({ where: { username: target }, include: { scopes: true } });
    assert.equal(user.scopes.length, 1); assert.equal(user.scopes[0]!.resourceId, machineId);
    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { userId: adminId, resourceId: user.id, action: 'user.access.change' } });
    assert.equal(audit.actor, admin); assert.equal(audit.reason, 'HTTP_ADMINISTRATION');
    assert.ok(!JSON.stringify(audit).includes(temporaryPassword));
  });
  it('deactivates/reactivates users and resets passwords without disclosing previous secrets', async () => {
    assert.equal((await request('administration/users/' + target + '/active', 'PATCH', { active: false })).status, 200);
    assert.equal((await request('auth/login', 'POST', { username: target, password }, '')).status, 401);
    const reset = await request('administration/users/' + target + '/reset-password', 'POST', {});
    assert.equal(reset.status, 201);
    const credential = await reset.json() as TemporaryPassword;
    assert.notEqual(credential.password, temporaryPassword);
    const row = await prisma.user.findUniqueOrThrow({ where: { username: target } });
    assert.equal(row.isActive, false); assert.equal(row.mustChangePassword, true);
    assert.equal((await request('administration/users/' + target + '/active', 'PATCH', { active: true })).status, 200);
    await login(target, credential.password);
  });
  it('defaults both equipment types to 300 seconds and limits configuration by scope', async () => {
    const rows = await (await request('administration/equipment')).json() as EquipmentSetting[];
    assert.equal(rows.find((r) => r.id === machineId)?.persistenceIntervalSeconds, 300);
    assert.equal(rows.find((r) => r.id === machineId)?.runningKey, 'en_marcha');
    assert.equal(rows.find((r) => r.id === deviceId)?.persistenceIntervalSeconds, 300);
    const scoped = await (await request('administration/equipment', 'GET', undefined, limitedCookie)).json() as EquipmentSetting[];
    assert.equal(scoped.length, 1); assert.equal(scoped[0]!.id, deviceId);
    assert.equal((await request('administration/equipment/machines/' + machineId, 'PATCH', { persistenceIntervalSeconds: 60, runningKey: 'arranque' }, limitedCookie)).status, 404);
  });
  it('rejects invalid intervals, keys and device running signals', async () => {
    for (const value of [0, -1, 1.5, 86401, '300', null]) {
      assert.equal((await request('administration/equipment/devices/' + deviceId, 'PATCH', { persistenceIntervalSeconds: value })).status, 400);
    }
    assert.equal((await request('administration/equipment/machines/' + machineId, 'PATCH', { persistenceIntervalSeconds: 60, runningKey: '  ' })).status, 400);
    assert.equal((await request('administration/equipment/devices/' + deviceId, 'PATCH', { persistenceIntervalSeconds: 60, runningKey: 'bad' })).status, 400);
  });
  it('persists individual settings across a new database connection and audits changes', async () => {
    assert.equal((await request('administration/equipment/machines/' + machineId, 'PATCH', { persistenceIntervalSeconds: 120, runningKey: 'arranque' })).status, 200);
    assert.equal((await request('administration/equipment/devices/' + deviceId, 'PATCH', { persistenceIntervalSeconds: 600 }, limitedCookie)).status, 200);
    const reopened = new PrismaService(new ConfigService(validateEnvironment({ ...process.env })));
    try {
      const machine = await reopened.machine.findUniqueOrThrow({ where: { id: machineId } });
      const device = await reopened.device.findUniqueOrThrow({ where: { id: deviceId } });
      assert.equal(machine.persistenceIntervalSeconds, 120); assert.equal(machine.runningKey, 'arranque');
      assert.equal(device.persistenceIntervalSeconds, 600);
    } finally { await reopened.onModuleDestroy(); }
    const audit = await prisma.auditEvent.findFirstOrThrow({ where: { resourceId: machineId, result: 'SUCCESS', action: 'equipment.configuration.change' } });
    assert.equal(audit.userId, adminId);
  });
  it('edits actual role grants, revokes affected sessions and protects administrator policy', async () => {
    assert.equal((await request('administration/roles/ADMINISTRATOR/permissions', 'PATCH', { permissions: [] })).status, 400);
    assert.equal((await request('administration/roles/' + customRole + '/permissions', 'PATCH', { permissions: ['not.a.permission'] })).status, 400);
    assert.equal((await request('administration/roles/' + customRole + '/permissions', 'PATCH', { permissions: [] })).status, 200);
    assert.equal((await request('auth/me', 'GET', undefined, limitedCookie)).status, 401);
    assert.equal(await prisma.rolePermission.count({ where: { roleCode: customRole } }), 0);
  });
});
