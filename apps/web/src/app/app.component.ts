import { Component } from '@angular/core';
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

        <nav class="flex flex-wrap items-center gap-1 text-sm font-semibold text-slate-600" aria-label="Navegación principal">
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/" routerLinkActive="bg-emerald-50 text-emerald-800" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog" routerLinkActive="bg-emerald-50 text-emerald-800" [routerLinkActiveOptions]="{ exact: true }">Resumen</a>
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/areas" routerLinkActive="bg-emerald-50 text-emerald-800">Áreas</a>
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/machines" routerLinkActive="bg-emerald-50 text-emerald-800">Máquinas</a>
          <a class="rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900" routerLink="/catalog/devices" routerLinkActive="bg-emerald-50 text-emerald-800">Dispositivos</a>
        </nav>
      </div>
    </header>

    <main class="mx-auto min-h-[calc(100vh-9rem)] w-[min(100%-2rem,72rem)] py-10">
      <router-outlet />
    </main>

    <footer class="mx-auto w-[min(100%-2rem,72rem)] border-t border-slate-200 py-6 text-sm text-slate-500">
      Sprint 1 · Catálogo de solo lectura · Alcos El Alto
    </footer>
  `,
})
export class AppComponent {}
