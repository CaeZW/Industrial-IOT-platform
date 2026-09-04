import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { BrowserSecurityService } from './browser-security.service.js';
import { PasswordService } from './password.service.js';
import { PrismaAuthRepository } from './prisma-auth.repository.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthService, PasswordService, BrowserSecurityService,
    { provide: AuthRepository, useClass: PrismaAuthRepository },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, AuthRepository, PasswordService, BrowserSecurityService],
})
export class AuthModule {}

