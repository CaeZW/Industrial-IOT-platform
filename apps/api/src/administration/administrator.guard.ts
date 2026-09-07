import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { contextFor } from '../auth/auth.http.js';
import type { AuthRequest } from '../auth/auth.http.js';

@Injectable()
export class AdministratorGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    if (!request.session?.user.roles.includes('ADMINISTRATOR')) {
      await this.auth.denied(contextFor(request), 'ADMINISTRATOR_REQUIRED', request.session);
      throw new ForbiddenException('Esta operación requiere Administrador.');
    }
    return true;
  }
}
