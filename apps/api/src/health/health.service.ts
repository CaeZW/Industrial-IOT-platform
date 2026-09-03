import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { MqttConnectionService } from '../messaging/mqtt-connection.service.js';

interface ReadinessChecks {
  readonly mqtt: 'up' | 'down';
  readonly postgres: 'up' | 'down';
}

export interface ReadinessResult {
  readonly checks: ReadinessChecks;
  readonly status: 'ok';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttConnectionService,
  ) {}

  liveness(): { readonly status: 'ok' } {
    return { status: 'ok' };
  }

  async readiness(): Promise<ReadinessResult> {
    const checks: ReadinessChecks = {
      postgres: (await this.prisma.isReady()) ? 'up' : 'down',
      mqtt: this.mqtt.isReady() ? 'up' : 'down',
    };

    if (checks.postgres === 'down' || checks.mqtt === 'down') {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        checks,
      });
    }

    return { status: 'ok', checks };
  }
}
