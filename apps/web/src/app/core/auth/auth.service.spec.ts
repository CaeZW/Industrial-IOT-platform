import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import type { AuthSession } from '@industrial-iot-platform/contracts';
import { AuthService } from './auth.service';
import { RealtimeService } from '../realtime.service';

describe('browser session behavior', () => {
  const navigateByUrl = vi.fn().mockResolvedValue(true);
  const disconnect = vi.fn();
  const connect = vi.fn();
  const get = vi.fn();
  const post = vi.fn();
  const makeSession = (): AuthSession => ({
    passwordPolicy: { minLength: 8, maxLength: 128 },
    user: { id: 'test', username: 'test', name: 'Test', mustChangePassword: false,
      roles: ['OPERATOR'], permissions: ['page.dashboard.view'], scopes: [] },
    expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
    idleExpiresAt: new Date(Date.now() + 3600000).toISOString(),
  });
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('BroadcastChannel', undefined);
    vi.clearAllMocks();
    TestBed.configureTestingModule({ providers: [
      AuthService,
      { provide: HttpClient, useValue: { get, post } },
      { provide: Router, useValue: { navigateByUrl } },
      { provide: RealtimeService, useValue: { connect, disconnect } },
    ] });
    get.mockImplementation(() => of(makeSession()));
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  it('background checks and synthetic events never renew activity', async () => {
    const service = TestBed.inject(AuthService);
    await service.load();
    document.dispatchEvent(new Event('pointerdown'));
    await vi.advanceTimersByTimeAsync(70000);
    expect(get).toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it('clears the screen/session and disconnects realtime when idle expires', async () => {
    const service = TestBed.inject(AuthService);
    service.session.set({ ...makeSession(), idleExpiresAt: new Date(Date.now() + 5000).toISOString() });
    await vi.advanceTimersByTimeAsync(10000);
    expect(service.session()).toBeNull();
    expect(disconnect).toHaveBeenCalled();
    expect(navigateByUrl).toHaveBeenCalledWith('/login');
  });
  it('routes temporary-password users to password replacement without connecting realtime', async () => {
    const service = TestBed.inject(AuthService);
    const session = makeSession();
    post.mockReturnValue(of({ ...session, user: { ...session.user, mustChangePassword: true } }));
    await service.login('test', 'test-only-password');
    expect(navigateByUrl).toHaveBeenCalledWith('/change-password');
    expect(connect).not.toHaveBeenCalled();
  });
});
