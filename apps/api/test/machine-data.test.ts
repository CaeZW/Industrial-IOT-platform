import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { parseMachineMessage } from '../src/machine-data/machine-data.validation.js';
import { validateManualReadings } from '../src/machine-data/manual-process.dto.js';
const topic = 'iot/v1/machines/SIM-MACHINE-01/data';
function event() { return { eventId: randomUUID(), eventType: 'machine.data', schemaVersion: '1.0', eventTime: new Date().toISOString(),
  source: { service: 'simulator', machineId: 'SIM-MACHINE-01' }, payload: { en_marcha: true, custom: [0, false, null] } }; }
describe('machine message boundary', () => {
  it('preserves dynamic variables and leaves running-key interpretation to the machine policy', () => {
    const value = event(); assert.deepEqual(parseMachineMessage(topic, Buffer.from(JSON.stringify(value)), false)?.event.payload, value.payload);
    const withoutSignal = { ...value, payload: { custom: 0 } };
    assert.ok(parseMachineMessage(topic, Buffer.from(JSON.stringify(withoutSignal)), false));
  });
  it('rejects retained, mismatched, oversized, malformed, future and deeply nested messages', () => {
    const value = event(); const bytes = Buffer.from(JSON.stringify(value));
    assert.equal(parseMachineMessage(topic, bytes, true), null);
    assert.equal(parseMachineMessage(topic.replace('SIM-MACHINE-01', 'OTHER'), bytes, false), null);
    assert.equal(parseMachineMessage(topic, Buffer.alloc(262145), false), null);
    assert.equal(parseMachineMessage(topic, Buffer.from('{'), false), null);
    assert.equal(parseMachineMessage(topic, Buffer.from(JSON.stringify({ ...value, eventTime: new Date(Date.now() + 60000).toISOString() })), false), null);
    let nested: object = {}; for (let i = 0; i < 40; i++) nested = { nested };
    assert.equal(parseMachineMessage(topic, Buffer.from(JSON.stringify({ ...value, payload: nested })), false), null);
  });
});
describe('manual JSON boundary', () => {
  it('preserves dynamic keys and accepts no final reading only on close', () => {
    assert.doesNotThrow(() => validateManualReadings({ temperature: 0, alarm: false, extra: [null, 'á'] }, true));
    assert.doesNotThrow(() => validateManualReadings(undefined, false));
    assert.throws(() => validateManualReadings(undefined, true));
  });
  it('bounds payload size and nesting and rejects non-finite numbers and empty objects', () => {
    for (const value of [{}, [], null, { x: Infinity }, { x: 'á'.repeat(33000) }]) assert.throws(() => validateManualReadings(value, true));
    let value: object = { x: 1 }; for (let i = 0; i < 18; i++) value = { value };
    assert.throws(() => validateManualReadings(value, true));
    assert.throws(() => validateManualReadings(JSON.parse('{"constructor":"sensor"'), true));
    assert.throws(() => validateManualReadings(JSON.parse('{"__proto__":{"x":1}}'), true));
  });
});
