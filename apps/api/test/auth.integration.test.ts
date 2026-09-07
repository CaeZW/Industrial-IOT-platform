import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { config } from 'dotenv';
import { io } from 'socket.io-client';
import { PrismaService } from '../src/database/prisma.service.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaAuthRepository } from '../src/auth/prisma-auth.repository.js';
import { PrismaUsersRepository } from '../src/users/prisma-users.repository.js';
import { UsersService } from '../src/users/users.service.js';
import { PrismaCatalogRepository } from '../src/catalog/prisma-catalog.repository.js';
import { IDLE_MS } from '../src/auth/auth.policy.js';
import type { AuthSession } from '@industrial-iot-platform/contracts';

config({ path: '../../.env', quiet: true });
const suffix = randomUUID().slice(0, 8);
const username = 'test_' + suffix;
const roleCode = 'TEST_' + suffix;
const password = 'integration-only-password-' + suffix;
let app: INestApplication;
let prisma: PrismaService;
let users: UsersService;
let userId: string;
let areaId: string;
let maintenanceId: string;
let machineId: string;
let plantId: string;
let simulatedDevices = 0;
let base: string;
let cookie = '';
let changedPassword = password;
const origin = 'http://127.0.0.1:4200';
const testIp = '198.18.2.' + (parseInt(suffix.slice(0, 2), 16) % 250 + 1);
const actor = 'integration:' + suffix;
const createdUsernames: string[] = [username];

async function request(path: string, method = 'GET', body?: object, sessionCookie = cookie, requestOrigin = origin) {
  return fetch(base + '/api/' + path, {
    method,
    headers: { Origin: requestOrigin, 'X-IOT-Request': '1', 'X-Forwarded-For': testIp, 'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: sessionCookie } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function login() {
  const response = await request('auth/login', 'POST', { username, password: changedPassword }, '');
  assert.equal(response.status, 200);
  cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  return response;
}
function socketResult(sessionCookie: string, requestOrigin = origin): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = io(base + '/realtime', { transports: ['websocket'], reconnection: false,
      extraHeaders: { Cookie: sessionCookie, Origin: requestOrigin } });
    const timer = setTimeout(() => { socket.disconnect(); reject(new Error('Socket timeout')); }, 5000);
    const done = (value: string) => { clearTimeout(timer); socket.disconnect(); resolve(value); };
    socket.once('connect', () => done('connected'));
    socket.once('connect_error', () => done('denied'));
  });
}
before(async () => {
  const env = validateEnvironment({ ...process.env });
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(String(env.POSTGRES_HOST)), 'Tests must use local PostgreSQL');
  prisma = new PrismaService(new ConfigService(env));
  const passwords = new PasswordService();
  const userRepository = new PrismaUsersRepository(prisma);
  users = new UsersService(userRepository, passwords, new PrismaAuthRepository(prisma));
  await userRepository.initializePolicy({ actor, action: 'test.setup', resourceType: 'TEST',
    result: 'SUCCESS', reason: 'TEST_FIXTURE', correlationId: randomUUID() });
  const plant = await prisma.plant.findUniqueOrThrow({ where: { code: 'ALCOS-EL-ALTO' } });
  plantId = plant.id;
  areaId = (await prisma.area.findFirstOrThrow({ where: { code: 'ESTABILIDAD' } })).id;
  simulatedDevices = await prisma.device.count({ where: { code: 'SIM-DEVICE-01', deviceType: 'LOCAL_SIMULATOR', areaId } });
  maintenanceId = (await prisma.area.findFirstOrThrow({ where: { code: 'MANTENIMIENTO' } })).id;
  machineId = (await prisma.machine.findUniqueOrThrow({ where: { code: 'MQ-24-46' } })).id;
  await prisma.role.create({ data: { code: roleCode, name: 'Test fixture',
    permissions: { create: ['page.dashboard.view', 'page.machines.view', 'page.devices.view'].map((permissionCode) => ({ permissionCode })) } } });
  const user = await prisma.user.create({ data: {
    username, name: 'Disposable integration user', passwordHash: await passwords.hash(password),
    roles: { create: { roleCode } }, scopes: { create: { type: 'AREA', resourceId: areaId } },
  } });
  userId = user.id;
  // Load emitted Nest decorators: tsx intentionally does not emit DI metadata.
  const compiled = await import(new URL('../.tools/app.module.js', import.meta.url).href) as { AppModule: Type<unknown> };
  app = await NestFactory.create(compiled.AppModule, { logger: false });
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  if (app) await app.close();
  if (prisma) {
    // Remove only this run's explicitly named disposable identities; keep audit.
    await prisma.user.deleteMany({ where: { username: { in: createdUsernames } } });
    await prisma.role.deleteMany({ where: { code: roleCode } });
    await prisma.onModuleDestroy();
  }
});
describe('HTTP authentication, scopes and administration', { concurrency: false }, () => {
  it('denies anonymous catalog and untrusted login origins', async () => {
    assert.equal((await request('catalog/overview', 'GET', undefined, '')).status, 401);
    assert.equal((await request('auth/login', 'POST', { username, password }, '', 'http://evil.example')).status, 403);
    assert.equal((await request('auth/login', 'POST', { username, password: 'wrong' }, '')).status, 401);
  });
  it('creates an HttpOnly cookie but restricts temporary-password sessions', async () => {
    const response = await login();
    assert.match(response.headers.get('set-cookie')!, /HttpOnly/);
    assert.match(response.headers.get('set-cookie')!, /SameSite=Strict/);
    assert.equal((await response.json() as AuthSession).user.mustChangePassword, true);
    assert.equal((await request('catalog/overview')).status, 403);
    assert.equal(await socketResult(cookie), 'denied');
  });
  it('rotates credentials/session and rejects reuse of the old session', async () => {
    const previous = cookie;
    changedPassword = 'Ab9!' + suffix.slice(0, 4);
    const response = await request('auth/password', 'POST', { currentPassword: password, newPassword: changedPassword });
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    assert.notEqual(cookie, previous);
    assert.equal((await request('auth/me', 'GET', undefined, previous)).status, 401);
    assert.equal((await response.json() as AuthSession).user.mustChangePassword, false);
  });
  it('filters overview, counts, parent labels and malicious area filters', async () => {
    const response = await request('catalog/overview');
    assert.equal(response.status, 200);
    const data = await response.json() as { totals: object };
    assert.deepEqual(data.totals, { plants: 1, areas: 1, machines: 0, devices: 12 + simulatedDevices });
    const forbidden = await request('catalog/machines?areaId=' + maintenanceId);
    const list = await forbidden.json() as { items: unknown[]; meta: { totalItems: number } };
    assert.equal(list.items.length, 0);
    assert.equal(list.meta.totalItems, 0);
    const areas = await (await request('catalog/areas')).json() as { items: { id: string; deviceCount: number }[] };
    assert.equal(areas.items.length, 1);
    assert.equal(areas.items[0]?.id, areaId);
    assert.equal(areas.items[0]?.deviceCount, 12 + simulatedDevices);
  });
  it('authorizes WebSocket handshakes and refuses absent or hostile credentials', async () => {
    assert.equal(await socketResult(cookie), 'connected');
    assert.equal(await socketResult(''), 'denied');
    assert.equal(await socketResult(cookie, 'http://evil.example'), 'denied');
  });
  it('enforces action permissions in the API as well as aggregate counts', async () => {
    await prisma.rolePermission.deleteMany({ where: { roleCode, permissionCode: 'page.devices.view' } });
    try {
      assert.equal((await request('catalog/devices')).status, 403);
      const result = await (await request('catalog/overview')).json() as { totals: { devices: number } };
      assert.equal(result.totals.devices, 0);
    } finally {
      await prisma.rolePermission.create({ data: { roleCode, permissionCode: 'page.devices.view' } });
    }
  });
  it('does not renew inactivity on reads; expires idle sessions server-side', async () => {
    await prisma.session.updateMany({ where: { userId }, data: { lastActivityAt: new Date(Date.now() - 300000) } });
    const beforeRead = await prisma.session.findFirstOrThrow({ where: { userId } });
    assert.equal((await request('auth/me')).status, 200);
    const afterRead = await prisma.session.findFirstOrThrow({ where: { userId } });
    assert.equal(afterRead.lastActivityAt.getTime(), beforeRead.lastActivityAt.getTime());
    assert.equal((await request('auth/activity', 'POST', {})).status, 200);
    assert.ok((await prisma.session.findFirstOrThrow({ where: { userId } })).lastActivityAt > afterRead.lastActivityAt);
    await prisma.session.updateMany({ where: { userId }, data: { lastActivityAt: new Date(Date.now() - IDLE_MS - 1000) } });
    assert.equal((await request('catalog/overview')).status, 401);
    assert.equal((await request('auth/activity', 'POST', {})).status, 401);
    assert.equal(await socketResult(cookie), 'denied');
  });
  it('enforces absolute expiration despite recent interaction', async () => {
    await login();
    await prisma.session.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() - 1000), lastActivityAt: new Date() } });
    assert.equal((await request('auth/activity', 'POST', {})).status, 401);
  });
  it('invalidates active sessions immediately on disable and access changes', async () => {
    await login();
    const previous = cookie;
    await users.setActive(username, false, actor);
    assert.equal((await request('auth/me')).status, 401);
    assert.equal((await request('auth/login', 'POST', { username, password: changedPassword }, '')).status, 401);
    await users.setActive(username, true, actor);
    assert.equal((await request('auth/me', 'GET', undefined, previous)).status, 401);
    await login();
    await users.setAccess(username, 'OPERATOR', ['MACHINE:MQ-24-46'], actor);
    assert.equal((await request('auth/me')).status, 401);
  });
  it('a single-machine scope never leaks sibling equipment, even in aggregates', async () => {
    await login();
    const data = await (await request('catalog/overview')).json() as { totals: object };
    assert.deepEqual(data.totals, { plants: 1, areas: 1, machines: 1, devices: 0 });
    const machines = await (await request('catalog/machines')).json() as { items: { id: string }[] };
    assert.deepEqual(machines.items.map(({ id }) => id), [machineId]);
    const repo = new PrismaCatalogRepository(prisma);
    const noScope = await repo.getOverview({ scopes: [], permissions: ['page.machines.view', 'page.devices.view'] });
    assert.deepEqual(noScope.totals, { plants: 0, areas: 0, machines: 0, devices: 0 });
    const noPermission = await repo.getOverview({ scopes: [{ type: 'PLANT', resourceId: plantId }], permissions: [] });
    assert.equal(noPermission.totals.devices, 0);
    assert.equal(noPermission.totals.machines, 0);
  });
  it('logout revokes the server session', async () => {
    assert.equal((await request('auth/logout', 'POST', {})).status, 204);
    assert.equal((await request('auth/me')).status, 401);
  });
  it('creates users and resets passwords through the administration service', async () => {
    const newUsername = 'new_' + suffix;
    createdUsernames.push(newUsername);
    let temporary = '';
    await users.create({ name: 'Disposable created user', username: newUsername, email: null, role: 'QUALITY_CONTROL' },
      ['AREA:ESTABILIDAD'], actor, async (credentials) => { temporary = credentials[0]!.password; });
    const created = await prisma.user.findUniqueOrThrow({ where: { username: newUsername } });
    assert.equal(created.isActive, true);
    assert.equal(created.mustChangePassword, true);
    assert.equal(await new PasswordService().verify(temporary, created.passwordHash), true);
    const signedIn = await request('auth/login', 'POST', { username: newUsername, password: temporary }, '');
    assert.equal(signedIn.status, 200);
    const beforeReset = signedIn.headers.get('set-cookie')!.split(';')[0]!;
    await users.resetPassword(newUsername, actor, async (credentials) => { temporary = credentials[0]!.password; });
    assert.equal((await request('auth/me', 'GET', undefined, beforeReset)).status, 401);
    const reset = await prisma.user.findUniqueOrThrow({ where: { username: newUsername } });
    assert.notEqual(reset.passwordHash, created.passwordHash);
    assert.equal(await new PasswordService().verify(temporary, reset.passwordHash), true);
    await assert.rejects(() => users.setAccess(newUsername, 'OPERATOR', ['AREA:DOES-NOT-EXIST'], actor));
    await assert.rejects(() => users.create({ name: 'Duplicate', username: newUsername, email: null, role: 'OPERATOR' },
      [], actor, async () => { throw new Error('must not deliver'); }));
  });
  it('audits failures and mutations without password or token material', async () => {
    const rows = await prisma.auditEvent.findMany({ where: { OR: [{ actor }, { userId }, { action: 'auth.login', result: 'DENIED' }] } });
    assert.ok(rows.some(({ result }) => result === 'DENIED'));
    assert.ok(rows.some(({ action }) => action === 'user.access.change'));
    const serialized = JSON.stringify(rows);
    assert.equal(serialized.includes(password), false);
    assert.equal(serialized.includes(cookie), false);
    assert.equal(serialized.includes('scrypt$'), false);
  });
  it('persists login attempt limits and fails closed', async () => {
    const repo = new PrismaAuthRepository(prisma);
    const keys = ['a', 'b'].map((prefix) => (prefix + suffix).padEnd(64, '0'));
    try {
      for (let i = 0; i < 10; i++) assert.equal(await repo.takeLoginAttempt(keys, new Date(Date.now() + 900000)), true);
      assert.equal(await repo.takeLoginAttempt(keys, new Date(Date.now() + 900000)), false);
      assert.equal(await new PrismaAuthRepository(prisma).takeLoginAttempt(keys, new Date(Date.now() + 900000)), false);
    } finally { await prisma.loginWindow.deleteMany({ where: { key: { in: keys } } }); }
  });
});
