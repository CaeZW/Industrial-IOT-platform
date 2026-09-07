import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { AdminOptions } from '@industrial-iot-platform/contracts';
import { AdministrationApi, administrationError } from './administration-api.service';
import { AdministrationNavComponent } from './administration-nav.component';

@Component({
  selector: 'app-roles-admin', imports: [FormsModule, AdministrationNavComponent],
  template: `
    <app-administration-nav />
    <h1 class="text-3xl font-bold">Roles y permisos</h1>
    <p class="my-3 text-slate-600">Los cambios se aplican a todos los usuarios del rol y cierran sus sesiones. Los permisos no amplían las áreas o equipos asignados.</p>
    @if (error()) { <p role="alert" class="my-4 rounded-lg bg-red-50 p-4 text-red-800">{{ error() }}</p> }
    @if (notice()) { <p role="status" class="my-4 rounded-lg bg-emerald-50 p-4">{{ notice() }}</p> }
    @if (loading()) { <p role="status">Cargando roles…</p> }
    @else if (options(); as data) {
      <form (ngSubmit)="save()" class="mt-6 max-w-3xl rounded-xl border bg-white p-6">
        <fieldset [disabled]="busy()">
          <label class="block font-semibold">Rol<select class="my-3 block w-full rounded-lg border p-3" name="role" [ngModel]="role" (ngModelChange)="selectRole($event)">
            @for (r of data.roles; track r.code) { <option [value]="r.code">{{ r.name }}</option> }
          </select></label>
          @if (role === 'ADMINISTRATOR') { <p class="my-4 rounded-lg bg-amber-50 p-3">Los permisos de Administrador están protegidos para conservar el acceso de recuperación.</p> }
          <div class="grid gap-3 sm:grid-cols-2">
            @for (permission of data.permissions; track permission) {
              <label class="flex items-start gap-3 rounded-lg border p-3"><input type="checkbox" [disabled]="role === 'ADMINISTRATOR'" [checked]="permissions.includes(permission)" (change)="toggle(permission)" /><span>{{ label(permission) }}<small class="block text-slate-500">{{ permission }}</small></span></label>
            }
          </div>
          <p class="mt-4 text-sm text-slate-600">Control, alarmas y reportes son permisos preparados para funciones posteriores; no habilitan operaciones físicas en esta entrega. La administración de usuarios y roles requiere además ser Administrador.</p>
          <button type="submit" class="mt-5 rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" [disabled]="busy() || !role || role === 'ADMINISTRATOR'">{{ busy() ? 'Guardando…' : 'Guardar permisos' }}</button>
        </fieldset>
      </form>
    } @else { <button class="rounded-lg border p-3" (click)="load()">Reintentar</button> }
  `,
})
export class RolesAdminComponent implements OnInit {
  private readonly api = inject(AdministrationApi);
  readonly options = signal<AdminOptions | null>(null);
  readonly loading = signal(true); readonly busy = signal(false);
  readonly error = signal(''); readonly notice = signal('');
  role = ''; permissions: string[] = [];
  ngOnInit() { void this.load(); }
  async load() {
    this.loading.set(true); this.error.set('');
    try { this.options.set(await this.api.options('role')); this.selectRole(this.role || this.options()?.roles[0]?.code || ''); }
    catch (error) { this.error.set(administrationError(error)); }
    finally { this.loading.set(false); }
  }
  selectRole(role: string) { this.role = role; this.permissions = [...(this.options()?.roles.find((r) => r.code === role)?.permissions ?? [])]; }
  toggle(permission: string) { this.permissions = this.permissions.includes(permission) ? this.permissions.filter((p) => p !== permission) : [...this.permissions, permission]; }
  label(permission: string) {
    const labels: Record<string, string> = { 'page.dashboard.view': 'Ver resumen y áreas', 'page.machines.view': 'Ver máquinas', 'page.devices.view': 'Ver dispositivos',
      'machine.control': 'Controlar máquinas', 'alarm.acknowledge': 'Reconocer alarmas', 'report.create': 'Crear reportes', 'configuration.write': 'Configurar equipos',
      'user.manage': 'Administrar usuarios', 'role.manage': 'Administrar roles', 'audit.read': 'Consultar auditoría' };
    return labels[permission] ?? permission;
  }
  async save() {
    if (this.busy() || this.role === 'ADMINISTRATOR' || !window.confirm('¿Reemplazar los permisos de este rol? Se cerrarán las sesiones de todos sus usuarios.')) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try { await this.api.permissions(this.role, this.permissions); this.notice.set('Permisos guardados.'); await this.load(); }
    catch (error) { this.error.set(administrationError(error)); }
    finally { this.busy.set(false); }
  }
}
