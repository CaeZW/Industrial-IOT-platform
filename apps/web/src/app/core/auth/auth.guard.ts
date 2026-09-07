import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const session = await auth.load();
    if (!session) return router.parseUrl('/login');
    if (session.user.mustChangePassword && route.routeConfig?.path !== 'change-password') {
      return router.parseUrl('/change-password');
    }
    const permission: unknown = route.data['permission'];
    if (route.data['administrator'] === true && !session.user.roles.includes('ADMINISTRATOR')) {
      return router.parseUrl('/forbidden');
    }
    if (typeof permission === 'string' && !session.user.permissions.includes(permission)) {
      return router.parseUrl('/forbidden');
    }
    return true;
  } catch {
    auth.notice.set('Inicia sesión. Si la API no está disponible, comprueba el servicio local.');
    return router.parseUrl('/login');
  }
};
