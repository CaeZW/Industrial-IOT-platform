import { DOCUMENT } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { AuthSession } from '@industrial-iot-platform/contracts';
import { RealtimeService } from '../realtime.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly realtime = inject(RealtimeService);
  private readonly document = inject(DOCUMENT);
  private epoch = 0;
  private pendingActivity = false;
  private lastActivityRequest = 0;
  private lastCheck = 0;
  private checking = false;
  private readonly channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('iot-session');
  readonly session = signal<AuthSession | null>(null);
  readonly notice = signal('');

  constructor() {
    const activity = (event: Event) => { if (event.isTrusted && this.session()) this.pendingActivity = true; };
    for (const name of ['pointerdown', 'keydown', 'wheel']) {
      this.document.addEventListener(name, activity, { passive: true });
    }
    const timer = setInterval(() => { void this.tick(); }, 10000);
    if (this.channel) this.channel.onmessage = () => this.document.defaultView?.location.reload();
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      this.channel?.close();
      for (const name of ['pointerdown', 'keydown', 'wheel']) this.document.removeEventListener(name, activity);
    });
  }
  has(permission: string): boolean { return this.session()?.user.permissions.includes(permission) ?? false; }
  private accept(session: AuthSession): AuthSession {
    this.session.set(session);
    if (!session.user.mustChangePassword && this.has('page.dashboard.view')) this.realtime.connect();
    else this.realtime.disconnect();
    return session;
  }
  async load(): Promise<AuthSession | null> {
    const epoch = this.epoch;
    try {
      const session = await firstValueFrom(this.http.get<AuthSession>('/api/auth/me'));
      return epoch === this.epoch ? this.accept(session) : this.session();
    } catch (error) {
      if (epoch === this.epoch && error instanceof HttpErrorResponse && error.status === 401) this.session.set(null);
      throw error;
    }
  }
  async login(username: string, password: string): Promise<void> {
    this.epoch++;
    const session = await firstValueFrom(this.http.post<AuthSession>('/api/auth/login', { username, password }));
    this.accept(session);
    this.notice.set('');
    this.pendingActivity = false;
    this.channel?.postMessage('changed');
    await this.router.navigateByUrl(session.user.mustChangePassword ? '/change-password' : '/catalog');
  }
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    this.epoch++;
    const session = await firstValueFrom(this.http.post<AuthSession>('/api/auth/password', { currentPassword, newPassword }));
    this.realtime.disconnect();
    this.accept(session);
    this.channel?.postMessage('changed');
    await this.router.navigateByUrl('/catalog');
  }
  async logout(): Promise<void> {
    try { await firstValueFrom(this.http.post('/api/auth/logout', {})); }
    catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        this.notice.set('No se pudo cerrar la sesión en el servidor. Reintenta cuando vuelva la conexión.');
        return;
      }
    }
    this.expire('');
    this.channel?.postMessage('changed');
  }
  expire(message = 'Tu sesión terminó. Ingresa nuevamente.'): void {
    this.epoch++;
    this.session.set(null);
    this.pendingActivity = false;
    this.realtime.disconnect();
    this.notice.set(message);
    void this.router.navigateByUrl('/login');
  }
  private async tick(): Promise<void> {
    const session = this.session();
    if (!session || this.checking) return;
    const now = Date.now();
    if (now >= Date.parse(session.expiresAt) || now >= Date.parse(session.idleExpiresAt)) {
      this.expire(); return;
    }
    this.checking = true;
    const epoch = this.epoch;
    try {
      if (this.pendingActivity && now - this.lastActivityRequest >= 30000) {
        this.pendingActivity = false;
        this.lastActivityRequest = now;
        const refreshed = await firstValueFrom(this.http.post<AuthSession>('/api/auth/activity', {}));
        if (epoch === this.epoch) this.accept(refreshed);
      } else if (now - this.lastCheck >= 60000) {
        this.lastCheck = now;
        await this.load();
      }
    } catch (error) {
      if (epoch === this.epoch && error instanceof HttpErrorResponse && error.status === 401) this.expire();
    } finally { this.checking = false; }
  }
}

