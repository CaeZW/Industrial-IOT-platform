import 'reflect-metadata';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CatalogQueryDto } from '../src/catalog/catalog-query.dto.js';
import type {
  CatalogRepository,
  CatalogQuery,
} from '../src/catalog/catalog.repository.js';
import { CatalogService } from '../src/catalog/catalog.service.js';

describe('catalog query validation', () => {
  it('transforms valid pagination values', async () => {
    const query = plainToInstance(CatalogQueryDto, {
      page: '2',
      pageSize: '25',
      search: 'Bramcor',
    });

    assert.equal((await validate(query)).length, 0);
    assert.equal(query.page, 2);
    assert.equal(query.pageSize, 25);
  });

  it('rejects excessive pages, invalid areas and long searches', async () => {
    const query = plainToInstance(CatalogQueryDto, {
      page: '0',
      pageSize: '51',
      areaId: 'not-a-uuid',
      search: 'x'.repeat(101),
    });

    const properties = new Set(
      (await validate(query)).map(({ property }) => property),
    );

    assert.deepEqual(
      properties,
      new Set(['page', 'pageSize', 'areaId', 'search']),
    );
  });
});

describe('catalog application service', () => {
  it('delegates a machine query through its repository port', async () => {
    let receivedQuery: CatalogQuery | undefined;
    const repository = {
      getOverview: () => Promise.reject(new Error('not used')),
      listAreas: () => Promise.reject(new Error('not used')),
      listDevices: () => Promise.reject(new Error('not used')),
      listMachines: (query: CatalogQuery) => {
        receivedQuery = query;
        return Promise.resolve({
          items: [],
          meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
        });
      },
    } as CatalogRepository;
    const service = new CatalogService(repository);
    const query = { page: 1, pageSize: 20, search: 'UTA' };

    await service.listMachines(query, { scopes: [], permissions: [] });

    assert.deepEqual(receivedQuery, query);
  });
});
