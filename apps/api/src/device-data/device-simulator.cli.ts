import 'reflect-metadata';
import { Injectable, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { connect } from 'mqtt';
import { config } from 'dotenv';
import { PrismaService } from '../database/prisma.service.js';
import { DatabaseModule } from '../database/database.module.js';
import { validateEnvironment } from '../config/environment.js';

const IS_MACHINE = process.argv.includes('--machine');
const CODE = IS_MACHINE ? 'SIM-MACHINE-01' : 'SIM-DEVICE-01';
@Injectable()
class SimulatorRepository {
  constructor(private readonly prisma: PrismaService) {}
  async provision() {
    const existing = IS_MACHINE ? await this.prisma.machine.findUnique({ where: { code: CODE } }) : await this.prisma.device.findUnique({ where: { code: CODE } });
    if (existing) {
      const type = 'machineType' in existing ? existing.machineType : existing.deviceType;
      if (type !== 'LOCAL_SIMULATOR') throw new Error('El código del simulador pertenece a otro equipo.');
      return existing.id;
    }
    const area = await this.prisma.area.findFirstOrThrow({ where: { code: IS_MACHINE ? 'MANTENIMIENTO' : 'ESTABILIDAD', plant: { code: 'ALCOS-EL-ALTO' } } });
    const device = await this.prisma.$transaction(async (tx) => {
      const common = { code: CODE, areaId: area.id, description: 'Datos ficticios de desarrollo. No usar para reportes de planta.', metadata: { simulation: true } };
      const row = IS_MACHINE ? await tx.machine.create({ data: { ...common, name: 'SIMULADA · Máquina de proceso', machineType: 'LOCAL_SIMULATOR' } })
        : await tx.device.create({ data: { ...common, name: 'SIMULADO · Temperatura y humedad', deviceType: 'LOCAL_SIMULATOR' } });
      await tx.auditEvent.create({ data: { actor: 'local-simulator-cli', action: 'simulator.provision', resourceType: IS_MACHINE ? 'MACHINE' : 'DEVICE',
        resourceId: row.id, result: 'SUCCESS', reason: 'LOCAL_SIMULATION', correlationId: randomUUID() } });
      return row;
    });
    return device.id;
  }
}
@Injectable()
class SimulatorService {
  constructor(private readonly repository: SimulatorRepository) {}
  provision() { return this.repository.provision(); }
}
@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env', validate: validateEnvironment }), DatabaseModule], providers: [SimulatorRepository, SimulatorService] })
class SimulatorModule {}

async function main() {
  config({ path: '../../.env', quiet: true });
  const env = validateEnvironment({ ...process.env });
  for (const name of ['POSTGRES_HOST', 'MQTT_HOST']) {
    if (!['127.0.0.1', 'localhost', '::1'].includes(String(env[name]))) throw new Error('Simulador permitido solamente en localhost.');
  }
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.includes('init')) {
    const app = await NestFactory.createApplicationContext(SimulatorModule, { logger: false });
    try { const id = await app.get(SimulatorService).provision(); process.stdout.write('Simulador preparado: http://127.0.0.1:4200/' + (IS_MACHINE ? 'machines/' : 'devices/') + id + '\n'); }
    finally { await app.close(); }
    return;
  }
  const configService = new ConfigService(env);
  const mode = args.find((arg) => arg.startsWith('--state='))?.slice(8) ?? 'cycle';
  if (!['cycle', 'on', 'off'].includes(mode)) throw new Error('state debe ser cycle, on u off.');
  const username = configService.get<string>('MQTT_USERNAME');
  const password = configService.get<string>('MQTT_PASSWORD');
  const client = connect('mqtt://' + String(env.MQTT_HOST) + ':' + String(env.MQTT_PORT), {
    clientId: 'device-simulator-' + randomUUID(), reconnectPeriod: 2000,
    ...(username ? { username, ...(password ? { password } : {}) } : {}),
  });
  const countArg = args.find((arg) => arg.startsWith('--count='));
  const limit = countArg ? Number(countArg.slice(8)) : Infinity;
  if (!(limit > 0) || (Number.isFinite(limit) && !Number.isInteger(limit))) { client.end(true); throw new Error('count debe ser entero positivo.'); }
  let count = 0; let publishing = false;
  const stop = () => { clearInterval(timer); client.end(); };
  const publish = async () => {
    if (!client.connected || publishing) return;
    publishing = true;
    try {
      const running = mode === 'on' || (mode === 'cycle' && count % 15 < 10);
      const event = { eventId: randomUUID(), eventType: IS_MACHINE ? 'machine.data' : 'device.data', schemaVersion: '1.0', eventTime: new Date().toISOString(),
        source: { service: 'simulator', ...(IS_MACHINE ? { machineId: CODE } : { deviceId: CODE }) },
        payload: IS_MACHINE ? { en_marcha: running, arranque: running, temperatura: Number((45 + Math.sin(count / 4) * 5).toFixed(2)),
          presion: running ? 2.5 : 0, nivel: 250, alarma: false, estado: 'SIMULADA', extra: { contador: count } }
          : { temperatura: Number((22 + Math.sin(count / 4)).toFixed(2)), humedad: 45 + count % 10,
            cero: 0, alarma: false, estado: 'SIMULADO', extra: { contador: count } } };
      const payload = JSON.stringify(event);
      const topic = 'iot/v1/' + (IS_MACHINE ? 'machines/' : 'devices/') + CODE + '/data';
      await client.publishAsync(topic, payload, { qos: 1, retain: false });
      if (args.includes('--duplicates')) await client.publishAsync(topic, payload, { qos: 1, retain: false });
      count++; process.stdout.write('Lectura simulada ' + count + (IS_MACHINE ? (running ? ' ON' : ' OFF') : '') + (args.includes('--duplicates') ? ' + duplicado idéntico' : '') + '\n');
      if (count >= limit) stop();
    } catch { process.stderr.write('No se pudo publicar. Se reintentará con una nueva lectura.\n'); }
    finally { publishing = false; }
  };
  const timer = setInterval(() => { void publish(); }, 2000);
  client.on('connect', () => { void publish(); });
  client.on('error', () => { process.stderr.write('MQTT local no disponible.\n'); });
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
void main().catch(() => { process.stderr.write('No se pudo iniciar el simulador. Verifica infraestructura local y migraciones.\n'); process.exitCode = 1; });
