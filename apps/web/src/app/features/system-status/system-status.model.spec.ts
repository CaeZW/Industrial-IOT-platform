import { describe, expect, it } from 'vitest';

import { dependencySummary, readinessLabel } from './system-status.model';

describe('system status presentation', () => {
  it('uses a clear Spanish label for each state', () => {
    expect(readinessLabel('checking')).toBe('Comprobando servicios locales');
    expect(readinessLabel('ready')).toBe('Sistema local disponible');
    expect(readinessLabel('unavailable')).toBe(
      'Servicios locales no disponibles',
    );
  });

  it('summarizes only dependency state returned by NestJS', () => {
    expect(
      dependencySummary({
        status: 'ok',
        checks: { postgres: 'up', mqtt: 'up' },
      }),
    ).toBe('PostgreSQL up · MQTT up');
  });
});
