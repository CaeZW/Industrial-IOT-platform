import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import { BrowserSecurityService } from './auth/browser-security.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const host = config.getOrThrow<string>('API_HOST');
  const port = config.getOrThrow<number>('API_PORT');
  const browser = app.get(BrowserSecurityService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.enableCors({
    credentials: true,
    origin: (origin: string | undefined, callback: (error: Error | null, allowed: boolean) => void) => callback(null, browser.allows(origin)),
  });
  app.enableShutdownHooks();

  await app.listen(port, host);
  Logger.log(`API listening on http://${host}:${port}/api`, 'Bootstrap');
}

void bootstrap();
