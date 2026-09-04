import { afterEach, describe, expect, it, vi } from 'vitest';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { ChangePasswordComponent } from './change-password.component';

describe('password form policy', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('renders and updates both password inputs from the API policy', async () => {
    const session = signal({ user: { mustChangePassword: true }, passwordPolicy: { minLength: 8, maxLength: 128 } });
    TestBed.configureTestingModule({
      imports: [ChangePasswordComponent],
      providers: [{ provide: AuthService, useValue: { session, changePassword: vi.fn() } }],
    });
    const fixture = TestBed.createComponent(ChangePasswordComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    for (const id of ['new-password', 'confirm-password']) {
      const input = element.querySelector<HTMLInputElement>('#' + id)!;
      expect(input.minLength).toBe(8);
      expect(input.maxLength).toBe(128);
    }
    expect(element.textContent).toContain('Usa entre 8 y 128 caracteres');
    session.set({ user: { mustChangePassword: true }, passwordPolicy: { minLength: 12, maxLength: 100 } });
    await fixture.whenStable();
    expect(element.querySelector<HTMLInputElement>('#new-password')!.minLength).toBe(12);
    expect(element.querySelector<HTMLInputElement>('#confirm-password')!.maxLength).toBe(100);
  });
});
