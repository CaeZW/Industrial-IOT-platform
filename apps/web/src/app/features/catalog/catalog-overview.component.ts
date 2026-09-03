import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CatalogOverview } from '@industrial-iot-platform/contracts';

import { CatalogApiService } from '../../core/catalog-api.service';

@Component({
  selector: 'app-catalog-overview',
  imports: [RouterLink],
  template: `
    <header class="mb-8">
      <p class="text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase">
        Inventario de planta
      </p>
      <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Resumen del catálogo
      </h1>
      <p class="mt-3 max-w-2xl text-slate-600">
        Vista de solo lectura de la jerarquía administrada por NestJS.
      </p>
    </header>

    @if (loading()) {
      <p class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
        Cargando inventario…
      </p>
    } @else if (error()) {
      <section class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <p>{{ error() }}</p>
        <button class="mt-4 font-semibold underline" type="button" (click)="load()">
          Intentar nuevamente
        </button>
      </section>
    } @else if (overview(); as data) {
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 transition hover:border-emerald-300 hover:shadow-sm" routerLink="/catalog/areas">
          <span>Áreas</span><strong class="text-4xl font-bold tracking-tight text-slate-900">{{ data.totals.areas }}</strong>
        </a>
        <a class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 transition hover:border-emerald-300 hover:shadow-sm" routerLink="/catalog/machines">
          <span>Máquinas</span><strong class="text-4xl font-bold tracking-tight text-slate-900">{{ data.totals.machines }}</strong>
        </a>
        <a class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600 transition hover:border-emerald-300 hover:shadow-sm" routerLink="/catalog/devices">
          <span>Dispositivos</span><strong class="text-4xl font-bold tracking-tight text-slate-900">{{ data.totals.devices }}</strong>
        </a>
        <article class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
          <span>Plantas</span><strong class="text-4xl font-bold tracking-tight text-slate-900">{{ data.totals.plants }}</strong>
        </article>
      </section>

      <section class="mt-8 grid gap-4">
        <h2 class="text-xl font-bold text-slate-900">Plantas</h2>
        @for (plant of data.plants; track plant.id) {
          <article class="rounded-2xl border border-slate-200 bg-white p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="font-mono text-xs font-semibold text-emerald-700">
                  {{ plant.code }}
                </p>
                <h3 class="mt-1 text-2xl font-bold text-slate-900">{{ plant.name }}</h3>
              </div>
              <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {{ plant.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
            <p class="mt-5 text-sm text-slate-600">
              {{ plant.areaCount }} áreas · {{ plant.machineCount }} máquinas ·
              {{ plant.deviceCount }} dispositivos
            </p>
          </article>
        }
      </section>
    }
  `,
})
export class CatalogOverviewComponent {
  private readonly api = inject(CatalogApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly overview = signal<CatalogOverview | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api.overview().subscribe({
      next: (overview) => {
        this.overview.set(overview);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible consultar el catálogo mediante NestJS.');
        this.loading.set(false);
      },
    });
  }
}
