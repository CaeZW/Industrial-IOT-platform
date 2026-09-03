import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const composeArguments = [
  'compose',
  ...(existsSync('.env') ? ['--env-file', '.env'] : []),
  '-f',
  'infra/compose/compose.yaml',
];

function runDocker(arguments_, options = {}) {
  const result = spawnSync('docker', arguments_, {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });

  if (result.error) {
    throw new Error(`Docker is unavailable: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`Docker command failed with status ${result.status}`);
  }

  return result.stdout ?? '';
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function captureMqttMessage(topic, publish) {
  const subscriber = spawn(
    'docker',
    [
      'exec',
      'docker-mosquitto',
      'mosquitto_sub',
      '-h',
      '127.0.0.1',
      '-p',
      '1883',
      '-t',
      topic,
      '-C',
      '1',
      '-W',
      '10',
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  let output = '';
  subscriber.stdout.on('data', (chunk) => {
    output += chunk;
  });

  await wait(300);
  publish();

  const exitCode = await new Promise((resolve, reject) => {
    subscriber.once('error', reject);
    subscriber.once('close', resolve);
  });

  assert.equal(exitCode, 0, `MQTT subscriber failed for ${topic}`);
  return output.trim();
}

runDocker(['--version']);
runDocker([...composeArguments, 'config', '--quiet']);

const resolvedCompose = JSON.parse(
  runDocker([...composeArguments, 'config', '--format', 'json'], {
    capture: true,
  }),
);

for (const serviceName of ['postgres', 'mosquitto', 'nodered']) {
  const service = resolvedCompose.services[serviceName];
  assert.ok(service, `Missing Compose service: ${serviceName}`);

  for (const port of service.ports ?? []) {
    assert.equal(
      port.host_ip,
      '127.0.0.1',
      `${serviceName} must bind only to 127.0.0.1`,
    );
  }
}

assert.deepEqual(Object.keys(resolvedCompose.services.postgres.networks), [
  'application-data',
]);
assert.deepEqual(Object.keys(resolvedCompose.services.nodered.networks), [
  'iot-messaging',
]);

if (process.argv.includes('--start')) {
  runDocker([...composeArguments, 'up', '-d', '--wait']);
}

const containers = JSON.parse(
  runDocker(
    [
      'inspect',
      'docker-postgre',
      'docker-mosquitto',
      'docker-nodered',
    ],
    { capture: true },
  ),
);

for (const container of containers) {
  assert.equal(container.State.Running, true, `${container.Name} is not running`);
  assert.equal(
    container.State.Health?.Status,
    'healthy',
    `${container.Name} is not healthy`,
  );
}

const composeServiceByContainerName = new Map(
  Object.values(resolvedCompose.services).map((service) => [
    `/${service.container_name}`,
    service,
  ]),
);

for (const container of containers) {
  const service = composeServiceByContainerName.get(container.Name);
  assert.ok(service, `No Compose service found for ${container.Name}`);

  for (const port of service.ports ?? []) {
    const protocol = port.protocol ?? 'tcp';
    const bindings =
      container.NetworkSettings.Ports[`${port.target}/${protocol}`] ?? [];

    assert.equal(
      bindings.some(
        (binding) =>
          binding.HostIp === port.host_ip &&
          binding.HostPort === String(port.published),
      ),
      true,
      `${container.Name} is missing runtime binding ${port.host_ip}:${port.published}`,
    );
  }
}

const postgres = containers.find(
  (container) => container.Name === '/docker-postgre',
);
const nodeRed = containers.find(
  (container) => container.Name === '/docker-nodered',
);

assert.ok(postgres);
assert.ok(nodeRed);

const requiredVolumes = new Map([
  ['/docker-postgre', ['/var/lib/postgresql']],
  ['/docker-mosquitto', ['/mosquitto/data', '/mosquitto/log']],
  ['/docker-nodered', ['/data']],
]);

for (const container of containers) {
  for (const destination of requiredVolumes.get(container.Name) ?? []) {
    assert.equal(
      container.Mounts.some(
        (mount) => mount.Type === 'volume' && mount.Destination === destination,
      ),
      true,
      `${container.Name} is missing persistent volume ${destination}`,
    );
  }
}

assert.equal(
  Object.keys(postgres.NetworkSettings.Networks).some((network) =>
    network.endsWith('_iot-messaging'),
  ),
  false,
);
assert.equal(
  Object.keys(nodeRed.NetworkSettings.Networks).some((network) =>
    network.endsWith('_application-data'),
  ),
  false,
);

const validationSuffix = Date.now().toString(36);
const brokerTopic = `iot/v1/healthcheck/broker-${validationSuffix}`;
const brokerPayload = `broker-${validationSuffix}`;
const brokerMessage = await captureMqttMessage(brokerTopic, () => {
  runDocker([
    'exec',
    'docker-mosquitto',
    'mosquitto_pub',
    '-h',
    '127.0.0.1',
    '-p',
    '1883',
    '-t',
    brokerTopic,
    '-m',
    brokerPayload,
    '-q',
    '1',
  ]);
});
assert.equal(brokerMessage, brokerPayload);

const nodeRedTopic = `iot/v1/healthcheck/nodered-${validationSuffix}`;
const nodeRedPayload = `nodered-${validationSuffix}`;
const nodeRedPublisher = [
  "const mqtt = require('mqtt');",
  `const client = mqtt.connect('mqtt://docker-mosquitto:1883');`,
  `const timer = setTimeout(() => process.exit(1), 5000);`,
  `client.on('connect', () => client.publish(${JSON.stringify(nodeRedTopic)}, ${JSON.stringify(nodeRedPayload)}, { qos: 1 }, () => { clearTimeout(timer); client.end(false, {}, () => process.exit(0)); }));`,
  `client.on('error', () => process.exit(1));`,
].join(' ');
const nodeRedMessage = await captureMqttMessage(nodeRedTopic, () => {
  runDocker(['exec', 'docker-nodered', 'node', '-e', nodeRedPublisher]);
});
assert.equal(nodeRedMessage, nodeRedPayload);

const nodeRedPort = resolvedCompose.services.nodered.ports[0].published;
const adminResponse = await fetch(`http://127.0.0.1:${nodeRedPort}/flows`);
assert.ok(
  adminResponse.status === 401 || adminResponse.status === 403,
  `Node-RED admin API must reject anonymous access; received ${adminResponse.status}`,
);

const activeFlowAudit = [
  "const fs = require('node:fs');",
  "const path = '/data/flows.json';",
  'if (!fs.existsSync(path)) process.exit(0);',
  'const flows = JSON.parse(fs.readFileSync(path, \'utf8\'));',
  "const operational = flows.map(({ info, label, name, ...node }) => node);",
  "if (/172[.]16[.]201[.]31|postgres(?:ql)?|5432/i.test(JSON.stringify(operational))) process.exit(2);",
].join(' ');
runDocker(['exec', 'docker-nodered', 'node', '-e', activeFlowAudit]);

console.log('Sprint 0 infrastructure is healthy and isolated.');
console.log('Persistent Docker volumes are attached.');
console.log('MQTT broker and Node-RED publish/subscribe checks passed.');
console.log('Node-RED admin API rejects anonymous access.');
console.log('Active Node-RED flows contain no production or PostgreSQL reference.');
