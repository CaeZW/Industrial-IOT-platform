import { Injectable } from '@nestjs/common';
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

  getOverview(): Promise<CatalogOverview> {
    return this.repository.getOverview();
  }

  listAreas(query: CatalogQuery): Promise<PageResult<CatalogArea>> {
    return this.repository.listAreas(query);
  }

  listDevices(query: CatalogQuery): Promise<PageResult<CatalogEquipment>> {
    return this.repository.listDevices(query);
  }

  listMachines(query: CatalogQuery): Promise<PageResult<CatalogEquipment>> {
    return this.repository.listMachines(query);
  }
}
