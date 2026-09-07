import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

import { createPostgresUrl } from '../src/config/environment.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { areas, devices, machines, type EquipmentSeed } from './seed-data.js';

config({ path: '../../.env', quiet: true });

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function databaseUrl(): string {
  const port = Number(requiredEnvironmentValue('POSTGRES_PORT'));

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('POSTGRES_PORT must be an integer between 1 and 65535');
  }

  return createPostgresUrl({
    database: requiredEnvironmentValue('POSTGRES_DB'),
    host: requiredEnvironmentValue('POSTGRES_HOST'),
    password: requiredEnvironmentValue('POSTGRES_PASSWORD'),
    port,
    user: requiredEnvironmentValue('POSTGRES_USER'),
  });
}

function areaId(areaByName: ReadonlyMap<string, string>, name: string): string {
  const id = areaByName.get(name);

  if (id === undefined) {
    throw new Error(`Seed references an unknown area: ${name}`);
  }

  return id;
}
function manualMachine(legacyId: number) {
  const definitions: Record<number, readonly { key: string; label: string; type: 'number' | 'text' | 'boolean' }[]> = {
    2: [{ key: 'obs', label: 'Observaciones', type: 'text' }, { key: 'w407', label: 'W407', type: 'boolean' }, { key: 'w415', label: 'W415', type: 'boolean' }, { key: 'presion', label: 'Presión', type: 'number' }, { key: 'purgaFondo', label: 'Purga de fondo', type: 'boolean' }],
    3: [{ key: 'obs', label: 'Observaciones', type: 'text' }, { key: 'ruido', label: 'Ruido', type: 'boolean' }, { key: 'aceite', label: 'Aceite', type: 'boolean' }, { key: 'presion', label: 'Presión', type: 'number' }, { key: 'temperatura', label: 'Temperatura', type: 'number' }],
    6: [{ key: 'obs', label: 'Observaciones', type: 'text' }, { key: 'presion', label: 'Presión', type: 'number' }, { key: 'volumen', label: 'Volumen', type: 'number' }, { key: 'temperatura', label: 'Temperatura', type: 'number' }, { key: 'conductividad', label: 'Conductividad', type: 'number' }],
    7: [{ key: 'temp_in', label: 'Temperatura de entrada', type: 'number' }, { key: 'temp_out', label: 'Temperatura de salida', type: 'number' }],
    39: [{ key: 'Frecuencia', label: 'Frecuencia', type: 'number' }],
    45: [{ key: 'Dureza', label: 'Dureza', type: 'number' }, { key: 'Volumen', label: 'Volumen', type: 'number' }],
  };
  const shared = definitions[legacyId] ?? (legacyId === 4 || legacyId === 5 ? definitions[3] : legacyId === 40 ? definitions[39] : undefined);
  return shared ? { registrationMode: 'MANUAL', manualFormDefinition: [...shared] } : {};
}

async function upsertMachines(
  prisma: PrismaClient,
  areaByName: ReadonlyMap<string, string>,
  records: readonly EquipmentSeed[],
): Promise<void> {
  for (const record of records) {
    const data = {
      areaId: areaId(areaByName, record.area),
      code: record.code,
      name: record.name,
      description: record.description,
      isActive: true,
    };

    await prisma.machine.upsert({
      where: { legacyMachineId: record.legacyId },
      update: data,
      create: { ...data, legacyMachineId: record.legacyId, ...manualMachine(record.legacyId) },
    });
  }
}

async function upsertDevices(
  prisma: PrismaClient,
  areaByName: ReadonlyMap<string, string>,
  records: readonly EquipmentSeed[],
): Promise<void> {
  for (const record of records) {
    const data = {
      areaId: areaId(areaByName, record.area),
      code: record.code,
      name: record.name,
      description: record.description,
      isActive: true,
    };

    await prisma.device.upsert({
      where: { legacyDeviceId: record.legacyId },
      update: data,
      create: { ...data, legacyDeviceId: record.legacyId },
    });
  }
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: databaseUrl() });
  const prisma = new PrismaClient({ adapter });

  try {
    const plant = await prisma.plant.upsert({
      where: { code: 'ALCOS-EL-ALTO' },
      update: { name: 'Alcos El Alto', isActive: true },
      create: {
        code: 'ALCOS-EL-ALTO',
        name: 'Alcos El Alto',
        isActive: true,
      },
    });

    const areaByName = new Map<string, string>();

    for (const area of areas) {
      const persistedArea = await prisma.area.upsert({
        where: {
          plantId_code: { plantId: plant.id, code: area.code },
        },
        update: { name: area.name, isActive: true },
        create: {
          plantId: plant.id,
          code: area.code,
          name: area.name,
          isActive: true,
        },
      });
      areaByName.set(area.name, persistedArea.id);
    }

    await upsertMachines(prisma, areaByName, machines);
    await upsertDevices(prisma, areaByName, devices);

    const [areaCount, machineCount, deviceCount] = await prisma.$transaction([
      prisma.area.count({ where: { plantId: plant.id } }),
      prisma.machine.count({
        where: {
          legacyMachineId: { in: machines.map((machine) => machine.legacyId) },
        },
      }),
      prisma.device.count({
        where: {
          legacyDeviceId: { in: devices.map((device) => device.legacyId) },
        },
      }),
    ]);

    if (
      areaCount !== areas.length ||
      machineCount !== machines.length ||
      deviceCount !== devices.length
    ) {
      throw new Error('Inventory seed verification failed');
    }

    console.log(
      `Seed complete: 1 plant, ${areas.length} areas, ${machines.length} machines, ${devices.length} devices.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

await main();
