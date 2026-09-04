import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_MS } from './auth.policy.js';
import type { AuthResponse } from './auth.http.js';

@Injectable()
export class BrowserSecurityService {
  readonly origin: string;
  readonly secure: boolean;
  constructor(config: ConfigService) {
    this.origin = config.get<string>('AUTH_WEB_ORIGIN') ??
      'http://' + config.getOrThrow<string>('WEB_HOST') + ':' + config.getOrThrow<number>('WEB_PORT');
    const url = new URL(this.origin);
    this.secure = url.protocol === 'https:';
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((!local && !this.secure) || (!this.secure &&
      !['127.0.0.1', 'localhost', '::1'].includes(config.getOrThrow<string>('API_HOST')))) {
      throw new Error('Authentication requires HTTPS outside loopback.');
    }
    if (url.origin !== this.origin || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error('AUTH_WEB_ORIGIN must be an exact HTTP(S) origin.');
    }
  }
  allows(origin: string | undefined): boolean {
    if (origin === this.origin) return true;
    // Both documented localhost spellings are allowed only for local development.
    const url = new URL(this.origin);
    if (!this.secure && ['localhost', '127.0.0.1'].includes(url.hostname)) {
      url.hostname = url.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
      return origin === url.origin;
    }
    return false;
  }
  cookie(response: AuthResponse, token: string, remainingMs = SESSION_MS): void {
    response.setHeader('Set-Cookie', 'iot_session=' + token +
      '; HttpOnly; SameSite=Strict; Path=/; Max-Age=' + Math.max(0, Math.floor(remainingMs / 1000)) +
      (this.secure ? '; Secure' : ''));
  }
}

