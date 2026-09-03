import { Controller, Get } from '@nestjs/common';

import { HealthService, type ReadinessResult } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  liveness(): { readonly status: 'ok' } {
    return this.health.liveness();
  }

  @Get('ready')
  readiness(): Promise<ReadinessResult> {
    return this.health.readiness();
  }
}
