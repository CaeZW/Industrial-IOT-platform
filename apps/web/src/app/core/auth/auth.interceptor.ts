import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import type { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  if (!request.url.startsWith('/api/')) return next(request);
  const secured = request.clone({ setHeaders: { 'X-IOT-Request': '1' } });
  return next(secured).pipe(catchError((error: unknown) => {
    if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.startsWith('/api/auth/')) {
      auth.expire();
    }
    return throwError(() => error);
  }));
};

