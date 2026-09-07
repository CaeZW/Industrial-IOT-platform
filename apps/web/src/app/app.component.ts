import { Component, inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <header class="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div class="mx-auto flex w-[min(100%-2rem,72rem)] flex-wrap items-center justify-between gap-4 py-4">
        <a class="font-bold tracking-tight text-slate-900" routerLink="/">
          Industrial <span class="text-emerald-700">IoT</span>
        </a>

        @if (auth.session(); as session) {
        <nav class="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-600" aria-label="Navegación principal">
          @if (!session.user.mustChangePassword) {
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/" routerLinkActive="bg-emerald-50 text-emerald-800" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
          @if (auth.has('page.dashboard.view')) {
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog" routerLinkActive="bg-emerald-50 text-emerald-800" [routerLinkActiveOptions]="{ exact: true }">Resumen</a>
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/areas" routerLinkActive="bg-emerald-50 text-emerald-800">Áreas</a>
          }
          @if (auth.has('page.machines.view')) {
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/machines" routerLinkActive="bg-emerald-50 text-emerald-800">Máquinas</a>
          }
          @if (auth.has('page.devices.view')) {
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/devices" routerLinkActive="bg-emerald-50 text-emerald-800">Dispositivos</a>
          }
          @if (session.user.roles.includes('ADMINISTRATOR') && auth.has('user.manage')) {
          <a class="rounded-lg px-3 py-2 hover:bg-slate-100" routerLink="/administration/users" routerLinkActive="bg-emerald-50 text-emerald-800">Administración</a>
          } @else if (session.user.roles.includes('ADMINISTRATOR') && auth.has('role.manage')) {
          <a class="rounded-lg px-3 py-2 hover:bg-slate-100" routerLink="/administration/roles">Administración</a>
          } @else if (auth.has('configuration.write')) {
          <a class="rounded-lg px-3 py-2 hover:bg-slate-100" routerLink="/administration/equipment">Configuración</a>
          }
          }
          <a class="rounded-lg px-3 py-2 text-emerald-800" routerLink="/change-password">{{ session.user.username }}</a>
          <button class="rounded-lg border border-slate-300 px-3 py-2" type="button" (click)="auth.logout()">Salir</button>
        </nav>
        }
      </div>
    </header>

    <main class="mx-auto min-h-[calc(100vh-9rem)] w-[min(100%-2rem,72rem)] py-10">
      @if (auth.session() && auth.notice()) { <p role="alert" class="mb-4 rounded-xl bg-amber-50 p-4 text-amber-900">{{ auth.notice() }}</p> }
      <router-outlet />
    </main>

    <footer class="mx-auto w-[min(100%-2rem,72rem)] border-t border-slate-200 py-6 text-sm text-slate-500">
      Sprint 1 · Administración y catálogo · Alcos El Alto
    </footer>
  `,
})
export class AppComponent { readonly auth = inject(AuthService); }
