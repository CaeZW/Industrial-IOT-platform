import 'reflect-metadata';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { config } from 'dotenv';
import { connectAsync } from 'mqtt';
import type { MqttClient } from 'mqtt';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { DeviceDataEvent, DeviceDataView, DeviceReading } from '@industrial-iot-platform/contracts';
import type { MachineDataEvent, MachineDataView, MachineReading } from '@industrial-iot-platform/contracts';
import { PrismaMachineDataRepository } from '../src/machine-data/prisma-machine-data.repository.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { createPostgresUrl, validateEnvironment } from '../src/config/environment.js';
import { PasswordService } from '../src/auth/password.service.js';
import { PrismaDeviceDataRepository } from '../src/device-data/prisma-device-data.repository.js';
import { initialRoles } from '../src/users/initial-policy.js';

config({ path: '../../.env', quiet: true });
const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const testDb = 'iot_4c_test_' + suffix;
const code = 'TEST-DEVICE-' + suffix;
const origin = 'http://127.0.0.1:4200';
const password = 'device-tests-only-' + suffix;
let originalDb: string | undefined;
let control: Client;
let created = false;
let prisma: PrismaService;
let app: INestApplication;
let publisher: MqttClient;
let socket: Socket;
let deniedSocket: Socket;
let deviceId = ''; let otherDeviceId = ''; let areaId = ''; let userId = '';
let cookie = ''; let deniedCookie = ''; let base = '';
const received: DeviceReading[] = []; const deniedReceived: DeviceReading[] = [];
let previousTime = 0;
let machineId = ''; let otherMachineId = '';
const machineCode = 'TEST-MACHINE-' + suffix;
const machineReceived: MachineReading[] = []; const deniedMachineReceived: MachineReading[] = [];
async function waitFor(predicate: () => Promise<boolean> | boolean, timeout = 8000) {
  const until = Date.now() + timeout;
  while (!await predicate()) { if (Date.now() > until) throw new Error('Condition timed out'); await new Promise((resolve) => setTimeout(resolve, 30)); }
}
function event(): DeviceDataEvent {
  previousTime = Math.max(Date.now(), previousTime + 1);
  return { eventId: randomUUID(), eventType: 'device.data', schemaVersion: '1.0', eventTime: new Date(previousTime).toISOString(),
    source: { service: 'simulator', deviceId: code }, payload: { temperature: 0, enabled: false, text: 'prueba', unknown: { values: [1, null, 'x'] } } };
}
async function publish(value: DeviceDataEvent) { await publisher.publishAsync('iot/v1/devices/' + code + '/data', JSON.stringify(value), { qos: 1, retain: false }); }
function machineEvent(running: boolean | string | null): MachineDataEvent {
  const base = event();
  return { ...base, eventType: 'machine.data', source: { service: 'simulator', machineId: machineCode },
    payload: { en_marcha: running, presion: 0, temperatura: 25, alarma: false, extra: { lote: 'SIMULADO' } } };
}
async function publishMachine(value: MachineDataEvent) {
  await publisher.publishAsync('iot/v1/machines/' + machineCode + '/data', JSON.stringify(value), { qos: 1, retain: false });
  await waitFor(() => machineReceived.some((r) => r.eventId === value.eventId));
  return machineReceived.find((r) => r.eventId === value.eventId)!;
}
async function connectMachineSocket(session: string, readings: MachineReading[]) {
  const client = io(base + '/realtime', { autoConnect: false, transports: ['websocket'], reconnection: false, extraHeaders: { Cookie: session, Origin: origin } });
  client.on('machine.reading', (reading: MachineReading) => readings.push(reading));
  client.connect(); await waitFor(() => client.connected); return client;
}
async function request(path: string, session = cookie) {
  return fetch(base + '/api/' + path, { headers: { Cookie: session, Origin: origin } });
}
async function login(username: string) {
  const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: { Origin: origin, 'X-IOT-Request': '1', 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  assert.equal(response.status, 200); return response.headers.get('set-cookie')!.split(';')[0]!;
}
async function connectSocket(session: string, readings: DeviceReading[]) {
  const client = io(base + '/realtime', { autoConnect: false, transports: ['websocket'], reconnection: false, extraHeaders: { Cookie: session, Origin: origin } });
  client.on('device.reading', (reading: DeviceReading) => readings.push(reading));
  client.connect(); await waitFor(() => client.connected); return client;
}
async function startApp() {
  const compiled = await import(new URL('../.tools/app.module.js', import.meta.url).href) as { AppModule: Type<unknown> };
  app = await NestFactory.create(compiled.AppModule, { logger: false });
  app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(0, '127.0.0.1'); base = await app.getUrl();
  await waitFor(async () => (await request('health/ready')).status === 200);
}
before(async () => {
  const env = validateEnvironment({ ...process.env });
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(String(env.POSTGRES_HOST)));
  assert.ok(['localhost', '127.0.0.1', '::1'].includes(String(env.MQTT_HOST)));
  const url = (database: string) => createPostgresUrl({ database, host: String(env.POSTGRES_HOST), port: Number(env.POSTGRES_PORT), user: String(env.POSTGRES_USER), password: String(env.POSTGRES_PASSWORD) });
  control = new Client({ connectionString: url(String(env.POSTGRES_DB)) }); await control.connect();
  assert.match(testDb, /^iot_4c_test_[a-f0-9]{12}$/);
  await control.query('CREATE DATABASE "' + testDb + '"'); created = true;
  const migrationClient = new Client({ connectionString: url(testDb) }); await migrationClient.connect();
  try {
    const directory = new URL('../prisma/migrations/', import.meta.url);
    for (const name of (await readdir(directory)).filter((name) => /^\d/.test(name)).sort()) {
      await migrationClient.query(await readFile(new URL(name + '/migration.sql', directory), 'utf8'));
    }
  } finally { await migrationClient.end(); }
  originalDb = process.env.POSTGRES_DB; process.env.POSTGRES_DB = testDb;
  prisma = new PrismaService(new ConfigService(validateEnvironment({ ...process.env })));
  const plant = await prisma.plant.create({ data: { code: 'TEST', name: 'Test' } });
  const area = await prisma.area.create({ data: { code: 'TEST', name: 'Test', plantId: plant.id } }); areaId = area.id;
  deviceId = (await prisma.device.create({ data: { code, name: 'Simulated integration device', areaId, persistenceIntervalSeconds: 300 } })).id;
  otherDeviceId = (await prisma.device.create({ data: { code: code + '-OTHER', name: 'Other device', areaId } })).id;
  machineId = (await prisma.machine.create({ data: { code: machineCode, name: 'Simulated machine', areaId, persistenceIntervalSeconds: 300 } })).id;
  otherMachineId = (await prisma.machine.create({ data: { code: machineCode + '-OTHER', name: 'Other machine', areaId } })).id;
  await prisma.permission.createMany({ data: [{ code: 'page.devices.view' }, { code: 'page.machines.view' }] });
  await prisma.role.create({ data: { code: 'TEST', name: 'Test', permissions: { create: [{ permissionCode: 'page.devices.view' }, { permissionCode: 'page.machines.view' }] } } });
  const hash = await new PasswordService().hash(password);
  for (const [username, resourceId] of [['viewer', deviceId], ['other', otherDeviceId]]) {
    const user = await prisma.user.create({ data: { username: username!, name: 'Disposable viewer', passwordHash: hash, mustChangePassword: false,
      roles: { create: { roleCode: 'TEST' } }, scopes: { create: { type: 'DEVICE', resourceId: resourceId! } } } });
    if (username === 'viewer') userId = user.id;
  }
  await startApp(); cookie = await login('viewer'); deniedCookie = await login('other');
  socket = await connectSocket(cookie, received); deniedSocket = await connectSocket(deniedCookie, deniedReceived);
  const username = String(env.MQTT_USERNAME ?? ''); const secret = String(env.MQTT_PASSWORD ?? '');
  publisher = await connectAsync('mqtt://' + String(env.MQTT_HOST) + ':' + String(env.MQTT_PORT), { reconnectPeriod: 0,
    clientId: '4c-tests-' + suffix, ...(username ? { username, password: secret } : {}) });
});

describe('4D machine runs, process readings and recovery', { concurrency: false }, () => {
  it('shows OFF variables without storing process data, then opens one run on ON', async () => {
    await prisma.userScope.create({ data: { userId, type: 'MACHINE', resourceId: machineId } });
    socket.disconnect(); deniedSocket.disconnect();
    socket = await connectMachineSocket(cookie, machineReceived); deniedSocket = await connectMachineSocket(deniedCookie, deniedMachineReceived);
    const off = await publishMachine(machineEvent(false));
    assert.equal(off.running, false); assert.equal(off.run, null); assert.equal(await prisma.processData.count(), 0);
    const on = await publishMachine(machineEvent(true));
    assert.equal(on.persisted, true); assert.ok(on.run); assert.equal(await prisma.machineRun.count(), 1);
    assert.equal(await prisma.processData.count({ where: { machineRunId: on.run.id, machineId } }), 1);
    assert.equal(deniedMachineReceived.length, 0);
    assert.equal((await request('machines/' + machineId + '/data', deniedCookie)).status, 404);
    assert.equal((await request('machines/' + machineId + '/runs/' + on.run.id + '/readings', deniedCookie)).status, 404);
  });
  it('persists every valid ON heartbeat but only interval samples; invalid signals do not close or extend runs', async () => {
    const onEvent = machineEvent(true); const pulse = await publishMachine(onEvent);
    assert.equal(pulse.persisted, false);
    const run = await prisma.machineRun.findFirstOrThrow({ where: { machineId, finishedAt: null } });
    assert.equal(run.lastHeartbeatAt.toISOString(), onEvent.eventTime);
    const invalid = await publishMachine(machineEvent('false'));
    assert.equal(invalid.running, null); assert.equal(invalid.persisted, false);
    const preserved = await prisma.machineRun.findUniqueOrThrow({ where: { id: run.id } });
    assert.equal(preserved.finishedAt, null); assert.equal(preserved.lastHeartbeatAt.toISOString(), run.lastHeartbeatAt.toISOString());
    await publisher.publishAsync('iot/v1/machines/' + machineCode + '/data', JSON.stringify(onEvent), { qos: 1 });
    const barrier = await publishMachine(machineEvent(true));
    assert.equal(await prisma.machineRun.count(), 1); assert.equal(await prisma.processData.count(), 1);
    assert.equal(machineReceived.filter((r) => r.eventId === onEvent.eventId).length, 1);
    assert.equal(barrier.run?.id, run.id);
  });
  it('closes normally at OFF event time, records no OFF sample, and captures even short subsequent runs', async () => {
    const offEvent = machineEvent(false); const off = await publishMachine(offEvent);
    assert.equal(off.run?.finishedAt, offEvent.eventTime); assert.equal(off.persisted, false);
    const before = await prisma.processData.count(); await publishMachine(machineEvent(false));
    const on = await publishMachine(machineEvent(true)); assert.equal(on.persisted, true);
    const nextOff = await publishMachine(machineEvent(false)); assert.equal(nextOff.run?.id, on.run?.id);
    assert.equal(await prisma.machineRun.count(), 2); assert.equal(await prisma.processData.count(), before + 1);
    const rows = await (await request('machines/' + machineId + '/runs/' + on.run!.id + '/readings')).json() as { items: MachineReading[] };
    assert.equal(rows.items.length, 1); assert.equal(rows.items[0]!.readings['en_marcha'], true);
    assert.equal((await request('machines/' + machineId + '/runs/' + randomUUID() + '/readings')).status, 404);
  });
  it('after restart closes an open run at its persisted heartbeat when the first fresh signal is OFF', async () => {
    const on = await publishMachine(machineEvent(true));
    const pulse = await publishMachine(machineEvent(true)); const heartbeat = pulse.run!.lastHeartbeatAt;
    const count = await prisma.processData.count();
    socket.disconnect(); deniedSocket.disconnect(); await app.close(); await startApp();
    const snapshot = await (await request('machines/' + machineId + '/data')).json() as MachineDataView;
    assert.equal(snapshot.latestOrigin, 'HISTORY'); assert.equal(snapshot.latest?.running, null);
    assert.equal(snapshot.runs.find((r) => r.id === on.run!.id)?.finishedAt, null);
    socket = await connectMachineSocket(cookie, machineReceived);
    const off = await publishMachine(machineEvent(false));
    assert.equal(off.run?.id, on.run!.id); assert.equal(off.run?.finishedAt, heartbeat);
    assert.equal(await prisma.processData.count(), count);
  });
  it('after restart ON resumes the same run and enforces one-open-run and cross-machine data constraints', async () => {
    const on = await publishMachine(machineEvent(true)); const before = await prisma.processData.count();
    socket.disconnect(); await app.close(); await startApp(); socket = await connectMachineSocket(cookie, machineReceived);
    const resumed = await publishMachine(machineEvent(true));
    assert.equal(resumed.run?.id, on.run!.id); assert.equal(resumed.persisted, false);
    assert.equal(await prisma.processData.count(), before);
    const stored = await prisma.machineRun.findUniqueOrThrow({ where: { id: on.run!.id } });
    await assert.rejects(prisma.machineRun.create({ data: { machineId, startedAt: new Date(), lastHeartbeatAt: new Date(), observerId: randomUUID() } }));
    await assert.rejects(prisma.processData.create({ data: { machineId: otherMachineId, machineRunId: stored.id, eventId: randomUUID(),
      eventTime: new Date(), receivedAt: new Date(), readings: {}, sourceType: 'MQTT_DIRECT' } }));
    const offEvent = machineEvent(false); const off = await publishMachine(offEvent);
    assert.equal(off.run?.finishedAt, offEvent.eventTime);
  });
  it('uses configurable signal keys and sampling intervals, and serializes duplicate starts', async () => {
    await prisma.machine.update({ where: { id: machineId }, data: { runningKey: 'arranque', persistenceIntervalSeconds: 1 } });
    const repo = new PrismaMachineDataRepository(prisma); const observer = randomUUID(); const now = new Date();
    const value = { ...machineEvent(false), payload: { arranque: true, custom: 0 } };
    const results = await Promise.all([repo.ingest(machineCode, value, now, observer), repo.ingest(machineCode, value, now, observer)]);
    assert.equal(results.filter(Boolean).length, 1); const runId = results.find(Boolean)!.run!.id;
    const early = { ...machineEvent(false), payload: { arranque: true } };
    assert.equal((await repo.ingest(machineCode, early, new Date(now.getTime() + 999), observer))?.persisted, false);
    const due = { ...machineEvent(false), payload: { arranque: true } };
    assert.equal((await repo.ingest(machineCode, due, new Date(now.getTime() + 1000), observer))?.persisted, true);
    assert.equal(await prisma.processData.count({ where: { machineRunId: runId } }), 2);
    const recoveredOff = { ...machineEvent(true), payload: { arranque: false } };
    assert.equal((await repo.ingest(machineCode, recoveredOff, new Date(now.getTime() + 2000), randomUUID()))?.run?.finishedAt, due.eventTime);
    const snapshot = await (await request('machines/' + machineId + '/data')).json() as MachineDataView;
    assert.ok(snapshot.runs.length <= 10);
  });
});
after(async () => {
  socket?.disconnect(); deniedSocket?.disconnect();
  if (publisher) await publisher.endAsync(); if (app) await app.close(); if (prisma) await prisma.onModuleDestroy();
  if (originalDb !== undefined) process.env.POSTGRES_DB = originalDb;
  if (created) {
    assert.match(testDb, /^iot_4c_test_[a-f0-9]{12}$/);
    await control.query('DROP DATABASE "' + testDb + '"');
  }
  if (control) await control.end();
});
describe('4C real MQTT → PostgreSQL → WebSocket and REST', { concurrency: false }, () => {
  it('stores first JSONB, preserves unknown values and emits only to the authorized device viewer', async () => {
    socket.disconnect(); deniedSocket.disconnect();
    socket = await connectSocket(cookie, received); deniedSocket = await connectSocket(deniedCookie, deniedReceived);
    const value = event(); await publish(value);
    await waitFor(() => received.some((r) => r.eventId === value.eventId));
    assert.equal(received.at(-1)!.persisted, true); assert.deepEqual(received.at(-1)!.readings, value.payload);
    assert.equal(await prisma.deviceData.count({ where: { deviceId } }), 1);
    assert.equal(deniedReceived.length, 0);
    assert.equal((await request('devices/' + deviceId + '/data', deniedCookie)).status, 404);
    assert.equal((await request('devices/' + deviceId + '/history', deniedCookie)).status, 404);
  });
  it('updates live view for new readings but not history before the configured interval', async () => {
    const value = event(); await publish(value);
    await waitFor(() => received.some((r) => r.eventId === value.eventId));
    assert.equal(received.at(-1)!.persisted, false);
    const view = await (await request('devices/' + deviceId + '/data')).json() as DeviceDataView;
    assert.equal(view.latest?.eventId, value.eventId); assert.equal(view.latestOrigin, 'LIVE');
    assert.equal(await prisma.deviceData.count({ where: { deviceId } }), 1);
  });
  it('ignores duplicate, out-of-order and unknown-device messages', async () => {
    const value = event(); await publish(value); await waitFor(() => received.some((r) => r.eventId === value.eventId));
    const beforeCount = received.length;
    await publish(value); await publish({ ...value, eventId: randomUUID(), eventTime: new Date(Date.parse(value.eventTime) - 1000).toISOString() });
    const unknown = { ...event(), source: { service: 'simulator', deviceId: 'UNKNOWN-' + suffix } };
    await publisher.publishAsync('iot/v1/devices/' + unknown.source.deviceId + '/data', JSON.stringify(unknown), { qos: 1 });
    const barrier = event(); await publish(barrier); await waitFor(() => received.some((r) => r.eventId === barrier.eventId));
    assert.equal(received.length, beforeCount + 1); assert.equal(await prisma.deviceData.count(), 1); assert.equal(await prisma.device.count(), 2);
  });
  it('samples at the interval boundary, reads modified per-device settings and prevents concurrent duplicates', async () => {
    const repo = new PrismaDeviceDataRepository(prisma);
    const state = await prisma.deviceIngestionState.findUniqueOrThrow({ where: { deviceId } });
    const early = event();
    assert.equal((await repo.ingest(code, early, new Date(state.lastPersistedAt.getTime() + 299999)))?.persisted, false);
    const due = event();
    const results = await Promise.all([repo.ingest(code, due, new Date(state.lastPersistedAt.getTime() + 300000)), repo.ingest(code, due, new Date(state.lastPersistedAt.getTime() + 300000))]);
    assert.equal(results.filter(Boolean).length, 1); assert.equal(await prisma.deviceData.count(), 2);
    await prisma.device.update({ where: { id: deviceId }, data: { persistenceIntervalSeconds: 1 } });
    const next = event(); assert.equal((await repo.ingest(code, next, new Date(state.lastPersistedAt.getTime() + 301000)))?.persisted, true);
    assert.equal((await prisma.device.findUniqueOrThrow({ where: { id: otherDeviceId } })).persistenceIntervalSeconds, 300);
  });
  it('survives API restart without resampling duplicates and labels the persisted snapshot honestly', async () => {
    socket.disconnect(); deniedSocket.disconnect(); await app.close(); await startApp();
    socket = await connectSocket(cookie, received);
    const state = await prisma.deviceIngestionState.findUniqueOrThrow({ where: { deviceId } });
    const before = await prisma.deviceData.count();
    const view = await (await request('devices/' + deviceId + '/data')).json() as DeviceDataView;
    assert.equal(view.latestOrigin, 'HISTORY');
    const duplicate = { ...event(), eventId: state.lastEventId, eventTime: state.lastEventTime.toISOString() }; await publish(duplicate);
    const fresh = event(); await publish(fresh); await waitFor(() => received.some((r) => r.eventId === fresh.eventId));
    assert.equal(await prisma.deviceData.count(), before);
    assert.equal((await request('devices/' + deviceId + '/history?page=0')).status, 400);
  });
  it('checks current scopes on every outbound event without relying on the handshake', async () => {
    const before = received.length;
    await prisma.userScope.deleteMany({ where: { userId } });
    const fresh = event(); await publish(fresh);
    await waitFor(async () => (await prisma.deviceIngestionState.findUniqueOrThrow({ where: { deviceId } })).lastEventId === fresh.eventId);
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(received.length, before);
    assert.equal((await request('devices/' + deviceId + '/data')).status, 404);
  });
});

describe('4E/4F manual process journeys and stored evidence', { concurrency: false }, () => {
  const sessions: Record<string, string> = {}; const identities: Record<string, string> = {};
  let manualId = ''; let formMachineId = ''; let runId = ''; let startBody: { idempotencyKey: string; readings: Record<string, unknown> };
  const manualCode = 'MANUAL-' + suffix;
  const endpoint = () => 'machines/' + manualId + '/manual-runs';
  const post = (path: string, body: unknown, session = sessions['SUPERVISOR']!, requestOrigin = origin) => fetch(base + '/api/' + path,
    { method: 'POST', headers: { Cookie: session, Origin: requestOrigin, 'X-IOT-Request': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  before(async () => {
    manualId = (await prisma.machine.create({ data: { code: manualCode, name: 'Manual fixture', areaId } })).id;
    formMachineId = (await prisma.machine.create({ data: { code: manualCode + '-FORM', name: 'Manual form fixture', areaId,
      registrationMode: 'MANUAL', manualFormDefinition: [{ key: 'presion', label: 'Presión', type: 'number' }, { key: 'purga', label: 'Purga', type: 'boolean' }] } })).id;
    const hash = await new PasswordService().hash(password);
    for (const code of ['ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE', 'OPERATOR']) {
      const role = initialRoles.find((r) => r.code === code)!;
      await prisma.permission.createMany({ data: role.permissions.map((code) => ({ code })), skipDuplicates: true });
      await prisma.role.create({ data: { code, name: role.name, permissions: { create: role.permissions.map((permissionCode) => ({ permissionCode })) } } });
      const user = await prisma.user.create({ data: { username: code.toLowerCase(), name: 'Test ' + code, passwordHash: hash,
        mustChangePassword: false, roles: { create: { roleCode: code } }, scopes: { create: { type: 'MACHINE', resourceId: manualId } } } });
      identities[code] = user.id; sessions[code] = await login(user.username);
      await prisma.userScope.create({ data: { userId: user.id, type: 'MACHINE', resourceId: formMachineId } });
    }
    socket.disconnect(); deniedSocket.disconnect();
    socket = await connectMachineSocket(sessions['ADMINISTRATOR']!, machineReceived);
    deniedSocket = await connectMachineSocket(deniedCookie, deniedMachineReceived);
  });
  it('rejects anonymous, untrusted origins, operator and out-of-scope writes without creating data', async () => {
    const body = { idempotencyKey: randomUUID(), readings: { temperature: 0 } };
    assert.equal((await post(endpoint(), body, '')).status, 401);
    assert.equal((await post(endpoint(), body, sessions['SUPERVISOR'], 'http://evil.example')).status, 403);
    assert.equal((await post(endpoint(), body, sessions['OPERATOR'])).status, 403);
    assert.equal((await post('machines/' + otherMachineId + '/manual-runs', body)).status, 404);
    assert.equal(await prisma.machineRun.count({ where: { machineId: manualId } }), 0);
  });
  it('opens a manual run once under concurrent retries with a scoped websocket and responsible first reading', async () => {
    startBody = { idempotencyKey: randomUUID(), readings: { temperature: 0, alarm: false, batch: 'TEST-4E', nested: { items: [null, 2, 'á'] } } };
    const replies = await Promise.all([post(endpoint(), startBody), post(endpoint(), startBody)]);
    assert.deepEqual(replies.map((r) => r.status), [200, 200]);
    const first = await replies[0]!.json() as MachineReading; const second = await replies[1]!.json() as MachineReading;
    assert.deepEqual(first, second); runId = first.run!.id;
    assert.equal(first.run?.origin, 'MANUAL'); assert.equal(first.run?.startedBy?.id, identities['SUPERVISOR']);
    assert.equal(first.responsible?.id, identities['SUPERVISOR']);
    await waitFor(() => machineReceived.some((r) => r.eventId === first.eventId));
    assert.equal(deniedMachineReceived.some((r) => r.eventId === first.eventId), false);
    assert.equal(await prisma.machineRun.count({ where: { machineId: manualId } }), 1);
    const rows = await prisma.processData.findMany({ where: { machineId: manualId } });
    assert.equal(rows.length, 1); assert.deepEqual(rows[0]!.readings, startBody.readings);
    assert.equal(rows[0]!.recordedById, identities['SUPERVISOR']);
    assert.equal(await prisma.auditEvent.count({ where: { resourceId: manualId, action: 'machine.manual.start', result: 'SUCCESS' } }), 1);
  });
  it('rejects conflicting requests, forged actors and invalid JSON without partial writes', async () => {
    assert.equal((await post(endpoint(), { ...startBody, readings: { changed: true } })).status, 409);
    assert.equal((await post(endpoint(), { idempotencyKey: randomUUID(), readings: { a: 1 } })).status, 409);
    const path = endpoint() + '/' + runId + '/readings';
    for (const readings of [null, [], {}, { x: 'a'.repeat(66000) }, JSON.parse('{"constructor":"sensor"}'), JSON.parse('{"__proto__":{"x":1}}')]) {
      assert.equal((await post(path, { idempotencyKey: randomUUID(), readings })).status, 400);
    }
    assert.equal((await post(path, { idempotencyKey: randomUUID(), readings: { a: 1 }, userId: identities['ADMINISTRATOR'] })).status, 400);
    assert.equal(await prisma.processData.count({ where: { machineId: manualId } }), 1);
  });
  it('lets maintenance save immediately without the five-minute delay, linked to the same run and actor', async () => {
    const body = { idempotencyKey: randomUUID(), readings: { temperature: 22, alarm: false } };
    const path = endpoint() + '/' + runId + '/readings';
    const saved = await post(path, body, sessions['MAINTENANCE']); assert.equal(saved.status, 200);
    const sample = await saved.json() as MachineReading;
    assert.equal(sample.responsible?.id, identities['MAINTENANCE']); assert.equal(sample.run?.id, runId);
    assert.equal((await post(path, body, sessions['MAINTENANCE'])).status, 200);
    assert.equal(await prisma.processData.count({ where: { machineId: manualId } }), 2);
  });
  it('survives API restart; MQTT ON/OFF refresh variables but never changes the manual run or its samples', async () => {
    socket.disconnect(); deniedSocket.disconnect(); await app.close(); await startApp();
    socket = await connectMachineSocket(sessions['ADMINISTRATOR']!, machineReceived);
    deniedSocket = await connectMachineSocket(deniedCookie, deniedMachineReceived);
    const before = await prisma.machineRun.findUniqueOrThrow({ where: { id: runId } });
    for (const en_marcha of [true, false]) {
      const message = { ...machineEvent(en_marcha), source: { service: 'simulator', machineId: manualCode } };
      await publisher.publishAsync('iot/v1/machines/' + manualCode + '/data', JSON.stringify(message), { qos: 1 });
      await waitFor(() => machineReceived.some((r) => r.eventId === message.eventId));
      assert.equal(machineReceived.find((r) => r.eventId === message.eventId)?.persisted, false);
    }
    const after = await prisma.machineRun.findUniqueOrThrow({ where: { id: runId } });
    assert.equal(after.finishedAt, null); assert.equal(after.lastHeartbeatAt.getTime(), before.lastHeartbeatAt.getTime());
    assert.equal(await prisma.processData.count({ where: { machineId: manualId } }), 2);
    assert.equal((await post(endpoint(), startBody)).status, 200);
  });
  it('rolls back run, sample, receipt and success audit if database rejects a sample; the same key can retry safely', async () => {
    const path = endpoint() + '/' + runId + '/readings';
    const body = { idempotencyKey: randomUUID(), readings: { fail_test: true } };
    await prisma.$executeRawUnsafe("CREATE FUNCTION operations.fail_manual_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.readings ? 'fail_test' THEN RAISE EXCEPTION 'test rollback'; END IF; RETURN NEW; END $$");
    await prisma.$executeRawUnsafe('CREATE TRIGGER fail_manual_test BEFORE INSERT ON operations.process_data FOR EACH ROW EXECUTE FUNCTION operations.fail_manual_test()');
    try {
      assert.equal((await post(path, body)).status, 500);
      assert.equal(await prisma.manualOperation.count({ where: { key: body.idempotencyKey } }), 0);
      assert.equal(await prisma.processData.count({ where: { machineId: manualId } }), 2);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER fail_manual_test ON operations.process_data');
      await prisma.$executeRawUnsafe('DROP FUNCTION operations.fail_manual_test()');
    }
    assert.equal((await post(path, body)).status, 200);
  });
  it('administrator closes with a final sample; all three actors and exact JSONB values remain queryable', async () => {
    const body = { idempotencyKey: randomUUID(), readings: { final: true, temperature: 0 } };
    const path = endpoint() + '/' + runId + '/close';
    const response = await post(path, body, sessions['ADMINISTRATOR']); assert.equal(response.status, 200);
    const closed = await response.json() as MachineReading;
    assert.ok(closed.run?.finishedAt); assert.equal(closed.run?.closedBy?.id, identities['ADMINISTRATOR']);
    assert.equal((await post(path, body, sessions['ADMINISTRATOR'])).status, 200);
    assert.equal((await post(endpoint() + '/' + runId + '/readings', { idempotencyKey: randomUUID(), readings: { a: 1 } })).status, 409);
    const rows = await (await request('machines/' + manualId + '/runs/' + runId + '/readings', sessions['SUPERVISOR'])).json() as { items: MachineReading[] };
    assert.equal(rows.items.length, 4); assert.deepEqual(rows.items[0]!.readings, body.readings);
    assert.ok(rows.items.every((row) => row.sourceType === 'MANUAL' && row.responsible && row.run?.id === runId));
    const run = await prisma.machineRun.findUniqueOrThrow({ where: { id: runId } });
    assert.equal(closed.run!.durationSeconds, (run.finishedAt!.getTime() - run.startedAt.getTime()) / 1000);
    const audits = await prisma.auditEvent.findMany({ where: { resourceId: manualId, result: 'SUCCESS' } });
    assert.equal(audits.length, 4); assert.ok(audits.every((a) => !JSON.stringify(a.metadata).includes('TEST-4E')));
  });
  it('records the four supplied date/time values first, then exactly one complete machine-specific JSONB record', async () => {
    const startedAt = '2026-08-20T12:15:00.000Z'; const finishedAt = '2026-08-20T14:45:30.000Z';
    const controlBody = { idempotencyKey: randomUUID(), startedAt, finishedAt };
    const root = 'machines/' + formMachineId + '/manual-runs';
    const response = await post(root, controlBody); assert.equal(response.status, 200);
    const control = await response.json() as MachineReading; assert.equal(control.persisted, false); assert.deepEqual(control.readings, {});
    assert.equal(control.run?.startedAt, startedAt); assert.equal(control.run?.finishedAt, finishedAt); assert.equal(control.run?.durationSeconds, 9030);
    assert.equal(await prisma.processData.count({ where: { machineRunId: control.run!.id } }), 0);
    assert.deepEqual(await (await post(root, controlBody)).json(), control);
    const sampleUrl = root + '/' + control.run!.id + '/readings';
    for (const readings of [{ presion: 0 }, { presion: '0', purga: false }, { presion: 0, purga: false, extra: 1 }]) {
      assert.equal((await post(sampleUrl, { idempotencyKey: randomUUID(), readings })).status, 409);
    }
    const readings = { presion: 0, purga: false }; const sampleBody = { idempotencyKey: randomUUID(), readings };
    const sampleResponse = await post(sampleUrl, sampleBody, sessions['MAINTENANCE']); assert.equal(sampleResponse.status, 200);
    const sample = await sampleResponse.json() as MachineReading; assert.deepEqual(sample.readings, readings);
    assert.equal(sample.responsible?.id, identities['MAINTENANCE']); assert.equal(sample.run?.readingCount, 1);
    assert.equal((await post(sampleUrl, { idempotencyKey: randomUUID(), readings })).status, 409);
    const stored = await prisma.processData.findFirstOrThrow({ where: { machineRunId: control.run!.id } });
    assert.deepEqual(stored.readings, readings); assert.equal(stored.recordedById, identities['MAINTENANCE']);
    const view = await (await request('machines/' + formMachineId + '/data', sessions['SUPERVISOR'])).json() as MachineDataView;
    assert.equal(view.machine.registrationMode, 'MANUAL'); assert.deepEqual(view.machine.manualFormDefinition.map((f) => f.key), ['presion', 'purga']);
    assert.equal(view.runs.find((r) => r.id === control.run!.id)?.readingCount, 1);
  });
  it('rejects incomplete, future, reversed and overlapping manual hour controls without partial records', async () => {
    const root = 'machines/' + formMachineId + '/manual-runs'; const count = await prisma.machineRun.count({ where: { machineId: formMachineId } });
    const invalid = [
      { idempotencyKey: randomUUID(), startedAt: '2026-08-21T10:00:00Z' },
      { idempotencyKey: randomUUID(), startedAt: '2026-08-21T11:00:00Z', finishedAt: '2026-08-21T10:00:00Z' },
      { idempotencyKey: randomUUID(), startedAt: new Date(Date.now() + 120000).toISOString(), finishedAt: new Date(Date.now() + 180000).toISOString() },
      { idempotencyKey: randomUUID(), startedAt: '2026-08-20T13:00:00Z', finishedAt: '2026-08-20T15:00:00Z' },
    ];
    for (const body of invalid) assert.ok([400, 409].includes((await post(root, body)).status));
    assert.equal((await post(root, { idempotencyKey: randomUUID(), readings: { presion: 1, purga: true } })).status, 409);
    assert.equal(await prisma.machineRun.count({ where: { machineId: formMachineId } }), count);
  });
  for (const role of ['ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE']) {
    it(role + ' can independently register and close a complete scoped process without a final sample', async () => {
      const actor = sessions[role]!;
      const response = await post(endpoint(), { idempotencyKey: randomUUID(), readings: { batch: role, zero: 0 } }, actor);
      assert.equal(response.status, 200); const started = await response.json() as MachineReading;
      const path = endpoint() + '/' + started.run!.id;
      assert.equal((await post(path + '/readings', { idempotencyKey: randomUUID(), readings: { check: false } }, actor)).status, 200);
      const closure = { idempotencyKey: randomUUID() };
      const closed = await post(path + '/close', closure, actor); assert.equal(closed.status, 200);
      const value = await closed.json() as MachineReading; assert.equal(value.persisted, false);
      assert.equal(value.run?.startedBy?.id, identities[role]); assert.equal(value.run?.closedBy?.id, identities[role]);
      assert.equal(await prisma.processData.count({ where: { machineRunId: started.run!.id } }), 2);
    });
  }
  it('discards delayed automatic starts before a manual closure and refuses manual changes to an automatic run', async () => {
    const last = await prisma.machineRun.findFirstOrThrow({ where: { machineId: manualId }, orderBy: { startedAt: 'desc' } });
    const repo = new PrismaMachineDataRepository(prisma);
    const stale = { ...machineEvent(true), eventTime: last.finishedAt!.toISOString(), source: { service: 'simulator', machineId: manualCode } };
    const ignored = await repo.ingest(manualCode, stale, new Date(), randomUUID());
    assert.equal(ignored?.persisted, false); assert.equal(await prisma.machineRun.count({ where: { machineId: manualId, finishedAt: null } }), 0);
    const on = { ...machineEvent(true), source: { service: 'simulator', machineId: manualCode } };
    const observer = randomUUID(); const automatic = await repo.ingest(manualCode, on, new Date(), observer);
    assert.ok(automatic?.run); assert.equal(automatic.run.origin, 'AUTOMATIC');
    assert.equal((await post(endpoint(), { idempotencyKey: randomUUID(), readings: { a: 1 } })).status, 409);
    assert.equal((await post(endpoint() + '/' + automatic.run.id + '/close', { idempotencyKey: randomUUID() })).status, 409);
    assert.equal((await post(endpoint() + '/' + automatic.run.id + '/readings', { idempotencyKey: randomUUID(), readings: { a: 1 } })).status, 409);
    const off = { ...machineEvent(false), source: { service: 'simulator', machineId: manualCode } };
    await repo.ingest(manualCode, off, new Date(), observer);
  });
  it('enforces current scope and permission even for a previously successful idempotency key', async () => {
    await prisma.userScope.deleteMany({ where: { userId: identities['SUPERVISOR']! } });
    assert.equal((await post(endpoint(), startBody)).status, 404);
    await prisma.rolePermission.deleteMany({ where: { roleCode: 'MAINTENANCE', permissionCode: 'process.manual.write' } });
    assert.equal((await post(endpoint(), { idempotencyKey: randomUUID(), readings: { a: 1 } }, sessions['MAINTENANCE'])).status, 403);
  });
});
