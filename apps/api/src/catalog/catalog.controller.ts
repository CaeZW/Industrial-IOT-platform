import { Controller, Get, Query } from '@nestjs/common';
import { CurrentSession, RequirePermission } from '../auth/auth.http.js';
import type { SessionRecord } from '../auth/auth.types.js';
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
  @RequirePermission('page.dashboard.view')
  getOverview(@CurrentSession() session: SessionRecord): Promise<CatalogOverview> {
    return this.catalog.getOverview(session.user);
  }

  @Get('areas')
  @RequirePermission('page.dashboard.view')
  listAreas(@Query() query: CatalogQueryDto, @CurrentSession() session: SessionRecord): Promise<PageResult<CatalogArea>> {
    return this.catalog.listAreas(toCatalogQuery(query), session.user);
  }

  @Get('machines')
  @RequirePermission('page.machines.view')
  listMachines(
    @Query() query: CatalogQueryDto,
    @CurrentSession() session: SessionRecord,
  ): Promise<PageResult<CatalogEquipment>> {
    return this.catalog.listMachines(toCatalogQuery(query), session.user);
  }

  @Get('devices')
  @RequirePermission('page.devices.view')
  listDevices(
    @Query() query: CatalogQueryDto,
    @CurrentSession() session: SessionRecord,
  ): Promise<PageResult<CatalogEquipment>> {
    return this.catalog.listDevices(toCatalogQuery(query), session.user);
  }
}
