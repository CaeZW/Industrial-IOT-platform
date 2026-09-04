import { Injectable } from '@nestjs/common';
import type { CatalogAccess } from './catalog-access.js';
import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  PageResult,
} from '@industrial-iot-platform/contracts';

import {
  CatalogRepository,
  type CatalogQuery,
} from './catalog.repository.js';

@Injectable()
export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  getOverview(access: CatalogAccess): Promise<CatalogOverview> {
    return this.repository.getOverview(access);
  }

  listAreas(query: CatalogQuery, access: CatalogAccess): Promise<PageResult<CatalogArea>> {
    return this.repository.listAreas(query, access);
  }

  listDevices(query: CatalogQuery, access: CatalogAccess): Promise<PageResult<CatalogEquipment>> {
    return this.repository.listDevices(query, access);
  }

  listMachines(query: CatalogQuery, access: CatalogAccess): Promise<PageResult<CatalogEquipment>> {
    return this.repository.listMachines(query, access);
  }
}
