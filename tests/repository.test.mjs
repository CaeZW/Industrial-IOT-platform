import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { load as loadYaml } from 'js-yaml';

function read(path) {
  return readFileSync(path, 'utf8');
}

test('uses one context filename and no environment template', () => {
  const context = read('PROJECT_CONTEXT.md');
  const agents = read('AGENTS.md');
  const readme = read('README.md');
  const obsoleteContextName = ['PROJECT', 'MASTER', 'CONTEXT.md'].join('_');

  assert.equal(context.includes(obsoleteContextName), false);
  assert.equal(agents.includes(obsoleteContextName), false);
  assert.equal(readme.includes(obsoleteContextName), false);
  assert.equal(existsSync('.env.example'), false);
  assert.equal(existsSync('.env.template'), false);
  assert.match(read('.gitignore'), /^\.env\.\*$/mu);
});

test('keeps Node-RED and PostgreSQL on isolated networks', () => {
  const compose = loadYaml(read('infra/compose/compose.yaml'));

  assert.deepEqual(compose.services.postgres.networks, ['application-data']);
  assert.deepEqual(compose.services.nodered.networks, ['iot-messaging']);
  assert.deepEqual(compose.services.mosquitto.networks, ['iot-messaging']);
  assert.notEqual(compose.networks['application-data'].internal, true);
  assert.deepEqual(compose.services.postgres.ports, [
    '${POSTGRES_HOST}:${POSTGRES_PORT}:5432',
  ]);
  assert.ok(compose.services.postgres.healthcheck);
  assert.ok(compose.services.mosquitto.healthcheck);
  assert.ok(compose.services.nodered.healthcheck);
  assert.equal(
    compose.services.nodered.depends_on.mosquitto.condition,
    'service_healthy',
  );
});

test('keeps the Node-RED configuration free of database access', () => {
  const settings = read('infra/compose/nodered/settings.js');
  const simulator = JSON.parse(
    read('infra/compose/nodered/flows.simulator.json'),
  );

  assert.doesNotMatch(settings, /POSTGRES_|5432|172\.16\.201\.31/u);

  for (const node of simulator) {
    assert.doesNotMatch(node.type, /postgres|sql/iu);
    assert.notEqual(node.host, '172.16.201.31');
    assert.notEqual(node.broker, '172.16.201.31');
    assert.notEqual(node.port, '5432');
  }
});

test('parses CI, Compose and simulator configuration', () => {
  const workflow = loadYaml(read('.github/workflows/ci.yml'));
  const compose = loadYaml(read('infra/compose/compose.yaml'));
  const simulator = JSON.parse(
    read('infra/compose/nodered/flows.simulator.json'),
  );

  assert.ok(workflow.jobs.verify);
  assert.ok(compose.services.postgres);
  assert.ok(Array.isArray(simulator));
  assert.ok(simulator.length > 0);
});
