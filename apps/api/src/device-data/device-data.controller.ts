import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CurrentSession, RequirePermission } from '../auth/auth.http.js';
import type { SessionRecord } from '../auth/auth.types.js';
import { DeviceDataService } from './device-data.service.js';
export class DeviceHistoryQuery { @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1; }
@Controller('devices')
@RequirePermission('page.devices.view')
export class DeviceDataController {
  constructor(private readonly data: DeviceDataService) {}
  @Get(':id/data')
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentSession() session: SessionRecord) { return this.data.detail(id, session.user); }
  @Get(':id/history')
  history(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: DeviceHistoryQuery, @CurrentSession() session: SessionRecord) {
    return this.data.history(id, query.page, session.user);
  }
}
