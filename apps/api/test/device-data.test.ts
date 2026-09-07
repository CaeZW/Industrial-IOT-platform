import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { parseDeviceMessage } from '../src/device-data/device-data.validation.js';
const topic = 'iot/v1/devices/SIM-DEVICE-01/data';
function message() { return { eventId: randomUUID(), eventType: 'device.data', schemaVersion: '1.0', eventTime: new Date().toISOString(),
  source: { service: 'simulator', deviceId: 'SIM-DEVICE-01' }, payload: { zero: 0, bool: false, nullable: null, nested: { arbitrary: [1, 'text'] } } }; }
describe('device MQTT boundary', () => {
  it('preserves complete dynamic payloads including zero, false and nested unknown keys', () => {
    const value = message(); const parsed = parseDeviceMessage(topic, Buffer.from(JSON.stringify(value)), false);
    assert.deepEqual(parsed?.event.payload, value.payload);
  });
  it('rejects malformed, retained, unsupported, mismatched and future messages', () => {
    const value = message(); const payload = Buffer.from(JSON.stringify(value));
    assert.equal(parseDeviceMessage(topic, payload, true), null);
    assert.equal(parseDeviceMessage('iot/v1/machines/SIM-DEVICE-01/data', payload, false), null);
    assert.equal(parseDeviceMessage(topic, Buffer.from('{bad'), false), null);
    for (const modified of [{ ...value, schemaVersion: '2.0' }, { ...value, source: { service: 'simulator', deviceId: 'OTHER' } },
      { ...value, eventTime: new Date(Date.now() + 60000).toISOString() }]) {
      assert.equal(parseDeviceMessage(topic, Buffer.from(JSON.stringify(modified)), false), null);
    }
  });
  it('bounds payload size and nesting without constraining variable names', () => {
    assert.equal(parseDeviceMessage(topic, Buffer.alloc(262145), false), null);
    let nested: object = {}; for (let i = 0; i < 40; i++) nested = { nested };
    assert.equal(parseDeviceMessage(topic, Buffer.from(JSON.stringify({ ...message(), payload: nested })), false), null);
  });
});
