import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-administration-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <p class="text-sm font-semibold uppercase tracking-widest text-emerald-700">Administración</p>
    <nav aria-label="Administración" class="my-5 flex flex-wrap gap-3">
      @if (administrator() && auth.has('user.manage')) {
        <a class="rounded-lg border px-4 py-2" routerLink="/administration/users" routerLinkActive="bg-emerald-100">Usuarios y accesos</a>
      }
      @if (administrator() && auth.has('role.manage')) {
        <a class="rounded-lg border px-4 py-2" routerLink="/administration/roles" routerLinkActive="bg-emerald-100">Roles y permisos</a>
      }
      @if (auth.has('configuration.write')) {
        <a class="rounded-lg border px-4 py-2" routerLink="/administration/equipment" routerLinkActive="bg-emerald-100">Configuración de equipos</a>
      }
    </nav>
  `,
})
export class AdministrationNavComponent {
  readonly auth = inject(AuthService);
  administrator() { return this.auth.session()?.user.roles.includes('ADMINISTRATOR') ?? false; }
}
