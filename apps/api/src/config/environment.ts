import type { ConfigService } from '@nestjs/config';

const REQUIRED_TEXT_VALUES = [
  'POSTGRES_DB',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_HOST',
  'MQTT_HOST',
] as const;

const PORT_VALUES = [
  'POSTGRES_PORT',
  'MQTT_PORT',
  'API_PORT',
  'WEB_PORT',
] as const;

function requireText(config: Record<string, unknown>, name: string): string {
  const value = config[name];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function parsePort(config: Record<string, unknown>, name: string): number {
  const value = requireText(config, name);
  const port = Number(value);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return port;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const validated = { ...config };

  for (const name of REQUIRED_TEXT_VALUES) {
    validated[name] = requireText(config, name);
  }

  for (const name of PORT_VALUES) {
    validated[name] = parsePort(config, name);
  }

  validated.API_HOST = requireText(config, 'API_HOST');
  validated.WEB_HOST = requireText(config, 'WEB_HOST');

  return validated;
}

export interface DatabaseEnvironment {
  readonly database: string;
  readonly host: string;
  readonly password: string;
  readonly port: number;
  readonly user: string;
}

export function createPostgresUrl(environment: DatabaseEnvironment): string {
  const url = new URL('postgresql://localhost');
  url.username = environment.user;
  url.password = environment.password;
  url.hostname = environment.host;
  url.port = String(environment.port);
  url.pathname = `/${environment.database}`;
  url.searchParams.set('schema', 'public');

  return url.toString();
}

export function databaseEnvironment(
  config: ConfigService,
): DatabaseEnvironment {
  return {
    database: config.getOrThrow<string>('POSTGRES_DB'),
    host: config.getOrThrow<string>('POSTGRES_HOST'),
    password: config.getOrThrow<string>('POSTGRES_PASSWORD'),
    port: config.getOrThrow<number>('POSTGRES_PORT'),
    user: config.getOrThrow<string>('POSTGRES_USER'),
  };
}
