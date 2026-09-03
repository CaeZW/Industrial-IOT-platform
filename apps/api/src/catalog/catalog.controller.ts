import { Controller, Get, Query } from '@nestjs/common';
import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  PageResult,
} from '@industrial-iot-platform/contracts';

import { CatalogQueryDto } from './catalog-query.dto.js';
import type { CatalogQuery } from './catalog.repository.js';
import { CatalogService } from './catalog.service.js';

function toCatalogQuery(query: CatalogQueryDto): CatalogQuery {
  return {
    page: query.page,
    pageSize: query.pageSize,
    ...(query.search === undefined ? {} : { search: query.search.trim() }),
    ...(query.areaId === undefined ? {} : { areaId: query.areaId }),
  };
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('overview')
  getOverview(): Promise<CatalogOverview> {
    return this.catalog.getOverview();
  }

  @Get('areas')
  listAreas(@Query() query: CatalogQueryDto): Promise<PageResult<CatalogArea>> {
    return this.catalog.listAreas(toCatalogQuery(query));
  }

  @Get('machines')
  listMachines(
    @Query() query: CatalogQueryDto,
  ): Promise<PageResult<CatalogEquipment>> {
    return this.catalog.listMachines(toCatalogQuery(query));
  }

  @Get('devices')
  listDevices(
    @Query() query: CatalogQueryDto,
  ): Promise<PageResult<CatalogEquipment>> {
    return this.catalog.listDevices(toCatalogQuery(query));
  }
}
