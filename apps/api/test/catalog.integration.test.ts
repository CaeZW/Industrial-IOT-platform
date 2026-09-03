import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

import { PrismaCatalogRepository } from '../src/catalog/prisma-catalog.repository.js';
import { validateEnvironment } from '../src/config/environment.js';
import { PrismaService } from '../src/database/prisma.service.js';

config({ path: '../../.env', quiet: true });

let prisma: PrismaService;
let repository: PrismaCatalogRepository;

before(() => {
  const environment = validateEnvironment({ ...process.env });
  prisma = new PrismaService(new ConfigService(environment));
  repository = new PrismaCatalogRepository(prisma);
});

after(async () => {
  await prisma.onModuleDestroy();
});

describe('Prisma catalog repository', () => {
  it('returns the seeded hierarchy and exact inventory totals', async () => {
    const overview = await repository.getOverview();

    assert.deepEqual(overview.totals, {
      plants: 1,
      areas: 11,
      machines: 45,
      devices: 40,
    });
    assert.equal(overview.plants[0]?.name, 'Alcos El Alto');
  });

  it('paginates and searches machines deterministically', async () => {
    const firstPage = await repository.listMachines({ page: 1, pageSize: 10 });
    const search = await repository.listMachines({
      page: 1,
      pageSize: 20,
      search: 'Bramcor',
    });

    assert.equal(firstPage.items.length, 10);
    assert.equal(firstPage.meta.totalItems, 45);
    assert.equal(firstPage.meta.totalPages, 5);
    assert.equal(search.items.length, 1);
    assert.equal(search.items[0]?.code, 'MQ-24-46');
  });

  it('filters devices by area without crossing hierarchy boundaries', async () => {
    const areas = await repository.listAreas({ page: 1, pageSize: 50 });
    const sterileArea = areas.items.find(({ name }) => name === 'Estériles');

    assert.ok(sterileArea);

    const devices = await repository.listDevices({
      page: 1,
      pageSize: 50,
      areaId: sterileArea.id,
    });

    assert.equal(devices.meta.totalItems, 2);
    assert.equal(
      devices.items.every(({ area }) => area.id === sterileArea.id),
      true,
    );
  });
});
