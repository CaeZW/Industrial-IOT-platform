import { Component, inject, signal } from '@angular/core';
import type { OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AdminOptions, AdminUser, TemporaryPassword } from '@industrial-iot-platform/contracts';
import { AdministrationApi, administrationError } from './administration-api.service';
import { AdministrationNavComponent } from './administration-nav.component';

@Component({
  selector: 'app-users-admin', imports: [FormsModule, AdministrationNavComponent],
  template: `
    <app-administration-nav />
    <h1 class="text-3xl font-bold">Usuarios y accesos</h1>
    <p class="mt-2 text-slate-600">Gestiona cuentas y los equipos que cada persona puede consultar. Los cambios de acceso cierran sus sesiones.</p>
    @if (error()) { <p role="alert" class="my-4 rounded-lg bg-red-50 p-4 text-red-800">{{ error() }}</p> }
    @if (notice()) { <p role="status" class="my-4 rounded-lg bg-emerald-50 p-4 text-emerald-900">{{ notice() }}</p> }
    @if (credential(); as secret) {
      <section class="my-4 rounded-xl border border-amber-300 bg-amber-50 p-5" aria-label="Contraseña temporal">
        <h2 class="font-bold">Contraseña temporal de {{ secret.username }}</h2>
        <p class="my-2 break-all select-all font-mono">{{ secret.password }}</p>
        <p>Entrégala de forma privada. Debe cambiarla al ingresar. Se ocultará en dos minutos y no podrá consultarse de nuevo.</p>
        <button type="button" class="mt-3 rounded-lg border px-4 py-2" (click)="clearCredential()">Ya la guardé, ocultar</button>
      </section>
    }
    @if (loading()) { <p role="status" class="py-8">Cargando usuarios…</p> }
    @else if (options(); as data) {
      <div class="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section class="min-w-0 rounded-xl border bg-white p-4">
          <label class="block text-sm font-semibold">Buscar usuario
            <input class="mt-1 w-full rounded-lg border p-2" [(ngModel)]="search" placeholder="Nombre o username" />
          </label>
          <button type="button" class="my-4 rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" [disabled]="busy()" (click)="newUser()">Nuevo usuario</button>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead><tr class="border-b"><th class="py-3">Usuario</th><th>Rol / Estado</th><th>Acciones</th></tr></thead>
              <tbody>
                @for (user of filteredUsers(); track user.username) {
                  <tr class="border-b align-top">
                    <td class="py-3 pr-3"><strong>{{ user.name }}</strong><br>{{ user.username }}<br><span class="text-slate-500">{{ user.email || 'Sin correo' }}</span></td>
                    <td class="py-3 pr-3">{{ roleName(user.role) }}<br>{{ user.isActive ? 'Activo' : 'Inactivo' }} @if (user.mustChangePassword) { <br><span class="text-amber-700">Cambio de contraseña pendiente</span> }</td>
                    <td class="py-3"><div class="flex flex-col items-start gap-2">
                      <button type="button" class="text-emerald-800 underline disabled:opacity-50" [disabled]="busy()" (click)="edit(user)">Editar acceso</button>
                      <button type="button" class="text-slate-700 underline disabled:opacity-50" [disabled]="busy()" (click)="toggleActive(user)">{{ user.isActive ? 'Desactivar' : 'Activar' }}</button>
                      <button type="button" class="text-slate-700 underline disabled:opacity-50" [disabled]="busy()" (click)="reset(user)">Restablecer contraseña</button>
                    </div></td>
                  </tr>
                } @empty { <tr><td colspan="3" class="py-6">No hay usuarios que coincidan.</td></tr> }
              </tbody>
            </table>
          </div>
        </section>
        <form #form="ngForm" class="rounded-xl border bg-white p-5" (ngSubmit)="save()">
          <fieldset [disabled]="busy()" class="space-y-4">
            <legend class="mb-4 text-xl font-bold">{{ editing ? 'Acceso de ' + username : 'Crear usuario' }}</legend>
            @if (!editing) {
              <label class="block">Nombre<input class="mt-1 w-full rounded-lg border p-2" name="name" [(ngModel)]="name" required minlength="2" maxlength="160" /></label>
              <label class="block">Username<input class="mt-1 w-full rounded-lg border p-2" name="username" [(ngModel)]="username" required pattern="[a-z0-9._-]{2,64}" autocomplete="off" /><span class="text-xs text-slate-500">Minúsculas, números, punto, guion o guion bajo.</span></label>
              <label class="block">Correo opcional<input class="mt-1 w-full rounded-lg border p-2" name="email" [(ngModel)]="email" type="email" email maxlength="254" /></label>
            }
            <label class="block">Rol<select class="mt-1 w-full rounded-lg border p-2" name="role" [(ngModel)]="role" required>
              <option value="" disabled>Selecciona un rol</option>
              @for (r of data.roles; track r.code) { <option [value]="r.code">{{ r.name }}</option> }
            </select></label>
            <div><h3 class="font-semibold">Acceso por planta, áreas o equipos</h3>
              <p class="my-2 text-sm text-slate-600">Planta incluye todos sus equipos. Área incluye los suyos. Sin selección, no tendrá acceso a equipos.</p>
              <label class="block text-sm">Filtrar accesos<input class="mt-1 w-full rounded-lg border p-2" name="scopeSearch" [(ngModel)]="scopeSearch" /></label>
              <div class="mt-2 max-h-64 overflow-y-auto rounded-lg border p-3">
                @for (scope of filteredScopes(); track scope.value) {
                  <label class="flex items-start gap-2 py-1 text-sm"><input type="checkbox" [checked]="scopes.includes(scope.value)" (change)="toggleScope(scope.value)" />{{ scope.label }}</label>
                }
              </div><p class="mt-2 text-sm">{{ scopes.length }} alcances seleccionados</p>
            </div>
            <button class="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" type="submit" [disabled]="form.invalid || busy()">{{ busy() ? 'Guardando…' : editing ? 'Guardar acceso' : 'Crear y generar contraseña' }}</button>
          </fieldset>
        </form>
      </div>
    } @else { <button class="mt-4 rounded-lg border px-4 py-2" (click)="load()">Reintentar</button> }
  `,
})
export class UsersAdminComponent implements OnInit, OnDestroy {
  private readonly api = inject(AdministrationApi);
  readonly options = signal<AdminOptions | null>(null);
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal(''); readonly notice = signal('');
  readonly credential = signal<TemporaryPassword | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private destroyed = false;
  editing = false; username = ''; name = ''; email = ''; role = ''; scopes: string[] = [];
  search = ''; scopeSearch = '';
  ngOnInit() { void this.load(); }
  ngOnDestroy() { this.destroyed = true; this.clearCredential(); }
  clearCredential() { clearTimeout(this.timer); this.credential.set(null); }
  private showCredential(value: TemporaryPassword) {
    if (this.destroyed) return;
    this.clearCredential(); this.credential.set(value);
    this.timer = setTimeout(() => this.clearCredential(), 120000);
  }
  async load() {
    this.loading.set(true); this.error.set('');
    try { const [users, options] = await Promise.all([this.api.users(), this.api.options('user')]); this.users.set(users); this.options.set(options); }
    catch (error) { this.error.set(administrationError(error)); }
    finally { this.loading.set(false); }
  }
  filteredUsers() { const q = this.search.toLocaleLowerCase(); return this.users().filter((u) => (u.name + ' ' + u.username).toLocaleLowerCase().includes(q)); }
  filteredScopes() { return this.options()?.scopes.filter((s) => s.label.toLocaleLowerCase().includes(this.scopeSearch.toLocaleLowerCase())) ?? []; }
  roleName(code: string) { return this.options()?.roles.find((r) => r.code === code)?.name ?? code; }
  toggleScope(value: string) { this.scopes = this.scopes.includes(value) ? this.scopes.filter((s) => s !== value) : [...this.scopes, value]; }
  newUser() { this.editing = false; this.username = ''; this.name = ''; this.email = ''; this.role = ''; this.scopes = []; this.scopeSearch = ''; }
  edit(user: AdminUser) {
    this.editing = true; this.username = user.username; this.role = user.role; this.scopeSearch = '';
    this.scopes = (this.options()?.scopes ?? []).filter((s) => user.scopes.some((u) => u.type === s.type && u.resourceId === s.resourceId)).map((s) => s.value);
  }
  private async action(work: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.notice.set(''); this.clearCredential();
    try { await work(); this.notice.set('Cambio guardado.'); this.users.set(await this.api.users()); }
    catch (error) { this.error.set(administrationError(error)); }
    finally { this.busy.set(false); }
  }
  async save() {
    if (!this.role || !this.username) return;
    if (this.editing && !window.confirm('¿Reemplazar el rol y los accesos de ' + this.username + '? Sus sesiones se cerrarán.')) return;
    await this.action(async () => {
      if (this.editing) await this.api.access(this.username, this.role, this.scopes);
      else { const result = await this.api.create({ username: this.username, name: this.name, email: this.email || null, role: this.role, scopes: this.scopes }); this.showCredential(result); this.newUser(); }
    });
  }
  async toggleActive(user: AdminUser) {
    if (!window.confirm((user.isActive ? '¿Desactivar ' : '¿Activar ') + user.username + '? Sus sesiones se cerrarán.')) return;
    await this.action(async () => { await this.api.active(user.username, !user.isActive); });
  }
  async reset(user: AdminUser) {
    if (!window.confirm('¿Restablecer la contraseña de ' + user.username + '? La anterior dejará de funcionar y sus sesiones se cerrarán.')) return;
    await this.action(async () => { this.showCredential(await this.api.reset(user.username)); });
  }
}
