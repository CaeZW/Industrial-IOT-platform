import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <section class="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
      <div class="bg-slate-900 p-8 text-white sm:p-10">
        <p class="text-xs font-bold tracking-widest text-emerald-300 uppercase">Alcos El Alto</p>
        <h1 class="mt-6 text-4xl font-bold tracking-tight">Acceso a planta</h1>
        <p class="mt-5 leading-7 text-slate-300">Consulta las máquinas y dispositivos de tus áreas autorizadas con tu cuenta personal.</p>
        <p class="mt-12 text-sm text-slate-400">Sesión de hasta 8 horas.<br>Cierre tras 1 hora de inactividad.</p>
      </div>
      <form class="grid content-center gap-5 p-8 sm:p-10" (submit)="submit($event, username.value, password.value)">
        <h2 class="text-2xl font-bold text-slate-900">Iniciar sesión</h2>
        @if (auth.notice()) { <p class="text-sm text-slate-600" role="status">{{ auth.notice() }}</p> }
        <label class="grid gap-2 text-sm font-semibold text-slate-700" for="username">Username
          <input #username id="username" name="username" autocomplete="username" required maxlength="64"
            class="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-emerald-600" />
        </label>
        <label class="grid gap-2 text-sm font-semibold text-slate-700" for="password">Contraseña
          <input #password id="password" name="password" type="password" autocomplete="current-password" required maxlength="128"
            class="rounded-xl border border-slate-300 px-4 py-3 font-normal outline-emerald-600" />
        </label>
        @if (error()) { <p role="alert" class="rounded-xl bg-red-50 p-3 text-sm text-red-800">{{ error() }}</p> }
        <button class="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          type="submit" [disabled]="busy()">{{ busy() ? 'Validando…' : 'Ingresar' }}</button>
        <p class="text-xs leading-5 text-slate-500">Si olvidaste tu contraseña, solicita al administrador una nueva contraseña temporal.</p>
      </form>
    </section>
  `,
})
export class LoginComponent {
  readonly auth = inject(AuthService);
  readonly busy = signal(false);
  readonly error = signal('');
  async submit(event: Event, username: string, password: string): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { await this.auth.login(username, password); }
    catch (error) {
      this.error.set(error instanceof HttpErrorResponse && error.status === 429
        ? 'Demasiados intentos. Intenta nuevamente en 15 minutos.'
        : error instanceof HttpErrorResponse && error.status === 401
          ? 'Usuario o contraseña incorrectos.' : 'No se pudo iniciar sesión. Comprueba la API e intenta nuevamente.');
    } finally { this.busy.set(false); }
  }
}

