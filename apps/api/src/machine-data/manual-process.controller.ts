import { Body, CallHandler, Controller, ExecutionContext, HttpCode, Injectable, NestInterceptor, Param, ParseUUIDPipe, Post, Req, UseInterceptors } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { contextFor, RequirePermission } from '../auth/auth.http.js';
import type { AuthRequest } from '../auth/auth.http.js';
import { ManualProcessDto } from './manual-process.dto.js';
import { ManualProcessService } from './manual-process.service.js';
import type { JsonObject } from '@industrial-iot-platform/contracts';
function originalInput(request: AuthRequest, validated: ManualProcessDto): ManualProcessDto {
  return request.manualOriginalReadings !== undefined
    ? { ...validated, readings: request.manualOriginalReadings as JsonObject } : validated;
}
@Injectable()
class PreserveManualReadingsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const body = request.body as { readings?: unknown } | undefined;
    // Interceptors run before validation pipes; copy dynamic JSON before class-transformer filters meta-keys.
    if (body && Object.hasOwn(body, 'readings')) request.manualOriginalReadings = JSON.parse(JSON.stringify(body.readings));
    return next.handle();
  }
}
@Controller('machines')
@UseInterceptors(PreserveManualReadingsInterceptor)
export class ManualProcessController {
  constructor(private readonly service: ManualProcessService) {}
  @Post(':id/manual-runs') @HttpCode(200) @RequirePermission('machine.run.manual.manage')
  start(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: ManualProcessDto, @Req() req: AuthRequest) {
    return this.service.execute(id, undefined, 'start', originalInput(req, input), req.session!, contextFor(req));
  }
  @Post(':id/manual-runs/:runId/readings') @HttpCode(200) @RequirePermission('process.manual.write')
  reading(@Param('id', new ParseUUIDPipe()) id: string, @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body() input: ManualProcessDto, @Req() req: AuthRequest) {
    return this.service.execute(id, runId, 'reading', originalInput(req, input), req.session!, contextFor(req));
  }
  @Post(':id/manual-runs/:runId/close') @HttpCode(200) @RequirePermission('machine.run.manual.manage')
  close(@Param('id', new ParseUUIDPipe()) id: string, @Param('runId', new ParseUUIDPipe()) runId: string,
    @Body() input: ManualProcessDto, @Req() req: AuthRequest) {
    return this.service.execute(id, runId, 'close', originalInput(req, input), req.session!, contextFor(req));
  }
}
