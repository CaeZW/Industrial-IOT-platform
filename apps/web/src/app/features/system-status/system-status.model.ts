import type { ReadinessResponse } from '../../core/health-api.service';

export type SystemStatus = 'checking' | 'ready' | 'unavailable';

export function readinessLabel(status: SystemStatus): string {
  switch (status) {
    case 'checking':
      return 'Comprobando servicios locales';
    case 'ready':
      return 'Sistema local disponible';
    case 'unavailable':
      return 'Servicios locales no disponibles';
  }
}

export function dependencySummary(response: ReadinessResponse): string {
  return `PostgreSQL ${response.checks.postgres} · MQTT ${response.checks.mqtt}`;
}
