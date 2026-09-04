import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

import { PrismaCatalogRepository } from '../src/catalog/prisma-catalog.repository.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/database/prisma.service.js';
import type { CatalogAccess } from '../src/catalog/catalog-access.js';

config({ path: '../../.env', quiet: true });

let prisma: PrismaService;
let repository: PrismaCatalogRepository;
let access: CatalogAccess;

before(async () => {
  const environment = validateEnvironment({ ...process.env });
  prisma = new PrismaService(new ConfigService(environment));
  repository = new PrismaCatalogRepository(prisma);
  const plant = await prisma.plant.findUniqueOrThrow({ where: { code: 'ALCOS-EL-ALTO' } });
  access = { scopes: [{ type: 'PLANT', resourceId: plant.id }], permissions: ['page.machines.view', 'page.devices.view'] };
});

after(async () => {
  await prisma.onModuleDestroy();
});

describe('Prisma catalog repository', () => {
  it('returns the seeded hierarchy and exact inventory totals', async () => {
    const overview = await repository.getOverview(access);

    assert.deepEqual(overview.totals, {
      plants: 1,
      areas: 12,
      machines: 45,
      devices: 40,
    });
    assert.equal(overview.plants[0]?.name, 'Alcos El Alto');
  });

  it('paginates and searches machines deterministically', async () => {
    const firstPage = await repository.listMachines({ page: 1, pageSize: 10 }, access);
    const search = await repository.listMachines({
      page: 1,
      pageSize: 20,
      search: 'Bramcor',
    }, access);

    assert.equal(firstPage.items.length, 10);
    assert.equal(firstPage.meta.totalItems, 45);
    assert.equal(firstPage.meta.totalPages, 5);
    assert.equal(search.items.length, 1);
    assert.equal(search.items[0]?.code, 'MQ-24-46');
  });

  it('filters devices by area without crossing hierarchy boundaries', async () => {
    const areas = await repository.listAreas({ page: 1, pageSize: 50 }, access);
    const sterileArea = areas.items.find(({ name }) => name === 'Estériles');

    assert.ok(sterileArea);

    const devices = await repository.listDevices({
      page: 1,
      pageSize: 50,
      areaId: sterileArea.id,
    }, access);

    assert.equal(devices.meta.totalItems, 2);
    assert.equal(
      devices.items.every(({ area }) => area.id === sterileArea.id),
      true,
    );
  });

  it('keeps stability devices in their independent area', async () => {
    const areas = await repository.listAreas({ page: 1, pageSize: 50 }, access);
    const stabilityArea = areas.items.find(
      ({ name }) => name === 'Estabilidad',
    );
    const qualityArea = areas.items.find(
      ({ name }) => name === 'Control de calidad',
    );

    assert.ok(stabilityArea);
    assert.ok(qualityArea);

    const stabilityDevices = await repository.listDevices({
      page: 1,
      pageSize: 50,
      areaId: stabilityArea.id,
    }, access);
    const qualityDevices = await repository.listDevices({
      page: 1,
      pageSize: 50,
      areaId: qualityArea.id,
    }, access);

    assert.equal(stabilityDevices.meta.totalItems, 12);
    assert.equal(qualityDevices.meta.totalItems, 0);
    assert.equal(
      stabilityDevices.items.every(
        ({ area }) => area.id === stabilityArea.id,
      ),
      true,
    );
  });
});
