import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env', quiet: true });

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();

  if (value === undefined || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function databaseUrl(): string {
  const url = new URL('postgresql://localhost');
  url.username = requiredEnvironmentValue('POSTGRES_USER');
  url.password = requiredEnvironmentValue('POSTGRES_PASSWORD');
  url.hostname = requiredEnvironmentValue('POSTGRES_HOST');
  url.port = requiredEnvironmentValue('POSTGRES_PORT');
  url.pathname = `/${requiredEnvironmentValue('POSTGRES_DB')}`;
  url.searchParams.set('schema', 'public');

  return url.toString();
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl(),
  },
});
