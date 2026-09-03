import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ServiceUnavailableException } from '@nestjs/common';

import {
  createPostgresUrl,
  validateEnvironment,
} from '../src/config/environment.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { HealthService } from '../src/health/health.service.js';
import type { MqttConnectionService } from '../src/messaging/mqtt-connection.service.js';
import { devices, machines } from '../prisma/seed-data.js';

const validEnvironment: Record<string, unknown> = {
  POSTGRES_DB: 'industrial_iot',
  POSTGRES_USER: 'application',
  POSTGRES_PASSWORD: 'secret',
  POSTGRES_HOST: '127.0.0.1',
  POSTGRES_PORT: '55432',
  MQTT_HOST: '127.0.0.1',
  MQTT_PORT: '51883',
  API_HOST: '127.0.0.1',
  API_PORT: '3000',
  WEB_HOST: '127.0.0.1',
  WEB_PORT: '4200',
};

describe('environment validation', () => {
  it('parses validated port values as numbers', () => {
    const result = validateEnvironment(validEnvironment);

    assert.equal(result.API_PORT, 3000);
    assert.equal(result.POSTGRES_PORT, 55432);
  });

  it('rejects missing credentials and invalid ports', () => {
    assert.throws(
      () => validateEnvironment({ ...validEnvironment, POSTGRES_PASSWORD: '' }),
      /POSTGRES_PASSWORD/,
    );
    assert.throws(
      () => validateEnvironment({ ...validEnvironment, MQTT_PORT: '70000' }),
      /MQTT_PORT/,
    );
  });

  it('encodes database credentials safely', () => {
    const url = createPostgresUrl({
      database: 'industrial_iot',
      host: '127.0.0.1',
      password: 'p@ss word',
      port: 55432,
      user: 'application',
    });

    assert.equal(
      url,
      'postgresql://application:p%40ss%20word@127.0.0.1:55432/industrial_iot?schema=public',
    );
  });
});

describe('health readiness', () => {
  it('reports both local dependencies when ready', async () => {
    const prisma = { isReady: async () => true } as PrismaService;
    const mqtt = { isReady: () => true } as MqttConnectionService;
    const health = new HealthService(prisma, mqtt);

    assert.deepEqual(await health.readiness(), {
      status: 'ok',
      checks: { postgres: 'up', mqtt: 'up' },
    });
  });

  it('returns service unavailable when a dependency is down', async () => {
    const prisma = { isReady: async () => false } as PrismaService;
    const mqtt = { isReady: () => true } as MqttConnectionService;
    const health = new HealthService(prisma, mqtt);

    await assert.rejects(
      health.readiness(),
      ServiceUnavailableException,
    );
  });
});

describe('legacy inventory', () => {
  it('has unique legacy and integration identifiers', () => {
    assert.equal(new Set(machines.map(({ legacyId }) => legacyId)).size, 45);
    assert.equal(new Set(devices.map(({ legacyId }) => legacyId)).size, 40);
    assert.equal(new Set(machines.map(({ code }) => code)).size, 45);
    assert.equal(new Set(devices.map(({ code }) => code)).size, 40);
  });

  it('uses the approved alarm-system integration code', () => {
    const alarmSystem = machines.find(({ legacyId }) => legacyId === 18);

    assert.equal(alarmSystem?.code, 'AL-01-M');
  });
});
