import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-change-password',
  template: `
    <section class="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-xs font-bold tracking-widest text-emerald-700 uppercase">Cuenta personal</p>
      <h1 class="mt-3 text-3xl font-bold text-slate-900">Cambiar contraseña</h1>
      <p class="mt-4 text-slate-600">{{ auth.session()?.user.mustChangePassword
        ? 'Antes de acceder al catálogo, reemplaza tu contraseña temporal.'
        : 'El cambio cerrará tus otras sesiones abiertas.' }}</p>
      <form class="mt-6 grid gap-5" (submit)="submit($event, current.value, next.value, confirmation.value)">
        <label class="grid gap-2 text-sm font-semibold" for="current-password">Contraseña actual o temporal
          <input #current id="current-password" type="password" autocomplete="current-password" required [attr.maxlength]="policy()?.maxLength"
            class="rounded-xl border border-slate-300 px-4 py-3 outline-emerald-600" />
        </label>
        <label class="grid gap-2 text-sm font-semibold" for="new-password">Nueva contraseña
          <input #next id="new-password" type="password" autocomplete="new-password" required [attr.minlength]="policy()?.minLength" [attr.maxlength]="policy()?.maxLength"
            class="rounded-xl border border-slate-300 px-4 py-3 outline-emerald-600" />
        </label>
        <label class="grid gap-2 text-sm font-semibold" for="confirm-password">Repetir nueva contraseña
          <input #confirmation id="confirm-password" type="password" autocomplete="new-password" required [attr.minlength]="policy()?.minLength" [attr.maxlength]="policy()?.maxLength"
            class="rounded-xl border border-slate-300 px-4 py-3 outline-emerald-600" />
        </label>
        <p class="text-sm text-slate-500">Usa entre {{ policy()?.minLength }} y {{ policy()?.maxLength }} caracteres. Puedes usar una frase larga que recuerdes.</p>
        @if (error()) { <p role="alert" class="text-sm text-red-800">{{ error() }}</p> }
        <button class="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          type="submit" [disabled]="busy()">{{ busy() ? 'Guardando…' : 'Guardar contraseña' }}</button>
      </form>
    </section>
  `,
})
export class ChangePasswordComponent {
  readonly auth = inject(AuthService);
  readonly policy = computed(() => this.auth.session()?.passwordPolicy);
  readonly busy = signal(false);
  readonly error = signal('');
  async submit(event: Event, current: string, next: string, confirmation: string): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    if (next !== confirmation) { this.error.set('Las contraseñas no coinciden.'); return; }
    this.busy.set(true); this.error.set('');
    try { await this.auth.changePassword(current, next); }
    catch { this.error.set(`No se pudo cambiar. Revisa la contraseña actual, usa una diferente de ${this.policy()?.minLength}–${this.policy()?.maxLength} caracteres o inicia sesión nuevamente.`); }
    finally { this.busy.set(false); }
  }
}
