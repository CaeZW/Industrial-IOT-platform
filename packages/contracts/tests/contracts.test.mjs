import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deviceTopic,
  isMachineCommandMessage,
  isMachineDataEvent,
  machineTopic,
} from '../dist/index.js';

const EVENT_ID = '018f47a2-8b7b-7cc2-9f31-8ddc4f78f5b2';
const CORRELATION_ID = 'b3f80f20-97f5-4da3-8490-e197b5320a9f';

test('builds canonical business topics', () => {
  assert.equal(
    machineTopic('MQ-24-46', 'command/result'),
    'iot/v1/machines/MQ-24-46/command/result',
  );
  assert.equal(
    deviceTopic('ESP32_Client01', 'data'),
    'iot/v1/devices/ESP32_Client01/data',
  );
});

test('rejects wildcard and path injection in topic identifiers', () => {
  assert.throws(() => machineTopic('machine/+/data', 'data'), TypeError);
  assert.throws(() => deviceTopic('#', 'state'), TypeError);
});

test('accepts dynamic machine readings and preserves unknown keys', () => {
  assert.equal(
    isMachineDataEvent({
      eventId: EVENT_ID,
      eventType: 'machine.data',
      schemaVersion: '1.0',
      eventTime: '2026-09-03T12:00:00.000Z',
      correlationId: CORRELATION_ID,
      source: { service: 'nodered', machineId: 'MQ-24-46' },
      payload: {
        AI01: 23.74,
        arranque: true,
        vendorExtension: { nested: ['kept', 1] },
      },
    }),
    true,
  );
});

test('requires a future expiration for a physical command', () => {
  const command = {
    commandId: EVENT_ID,
    correlationId: CORRELATION_ID,
    idempotencyKey: 'operator-request-001',
    commandType: 'machine.start',
    createdAt: '2026-09-03T12:00:00.000Z',
    expiresAt: '2026-09-03T12:00:30.000Z',
    parameters: {},
  };

  assert.equal(isMachineCommandMessage(command), true);
  assert.equal(
    isMachineCommandMessage({
      ...command,
      expiresAt: '2026-09-03T11:59:59.000Z',
    }),
    false,
  );
});
