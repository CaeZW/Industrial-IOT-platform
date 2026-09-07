import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { CurrentSession, RequirePermission } from '../auth/auth.http.js';
import type { SessionRecord } from '../auth/auth.types.js';
import { MachineDataService } from './machine-data.service.js';
export class ProcessDataQuery { @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1; }
@Controller('machines')
@RequirePermission('page.machines.view')
export class MachineDataController {
  constructor(private readonly data: MachineDataService) {}
  @Get(':id/data')
  detail(@Param('id', new ParseUUIDPipe()) id: string, @CurrentSession() session: SessionRecord) { return this.data.detail(id, session.user); }
  @Get(':id/runs/:runId/readings')
  samples(@Param('id', new ParseUUIDPipe()) id: string, @Param('runId', new ParseUUIDPipe()) runId: string,
    @Query() query: ProcessDataQuery, @CurrentSession() session: SessionRecord) { return this.data.samples(id, runId, query.page, session.user); }
}
