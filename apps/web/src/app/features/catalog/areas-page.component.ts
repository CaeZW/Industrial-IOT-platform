import { Component, inject, signal } from '@angular/core';
import type { CatalogArea, PageMetadata } from '@industrial-iot-platform/contracts';

import { CatalogApiService } from '../../core/catalog-api.service';
import { pageRangeLabel } from './catalog-view.model';

const initialMeta: PageMetadata = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};

@Component({
  selector: 'app-areas-page',
  template: `
    <header class="mb-8">
      <p class="text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase">
        Jerarquía de planta
      </p>
      <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900">Áreas</h1>
      <p class="mt-3 text-slate-600">Organización operativa de Alcos El Alto.</p>
    </header>

    <section class="mb-6 flex flex-col gap-3 sm:flex-row">
      <label class="sr-only" for="area-search">Buscar áreas</label>
      <input
        #searchInput
        id="area-search"
        class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15"
        type="search"
        maxlength="100"
        placeholder="Buscar por nombre o código"
        [value]="search()"
        (keyup.enter)="applySearch(searchInput.value)"
      />
      <button
        class="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
        type="button"
        (click)="applySearch(searchInput.value)"
      >
        Buscar
      </button>
    </section>

    @if (loading()) {
      <p class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
        Cargando áreas…
      </p>
    } @else if (error()) {
      <p class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        {{ error() }}
      </p>
    } @else {
      <section class="grid gap-4 sm:grid-cols-2">
        @for (area of items(); track area.id) {
          <article class="rounded-2xl border border-slate-200 bg-white p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-mono text-xs font-semibold text-emerald-700">
                  {{ area.code }}
                </p>
                <h2 class="mt-1 text-xl font-bold text-slate-900">{{ area.name }}</h2>
                <p class="mt-1 text-sm text-slate-500">{{ area.plant.name }}</p>
              </div>
              <span class="size-2.5 rounded-full" [class.bg-emerald-500]="area.isActive" [class.bg-slate-300]="!area.isActive"></span>
            </div>
            <p class="mt-5 text-sm text-slate-600">
              {{ area.machineCount }} máquinas · {{ area.deviceCount }} dispositivos
            </p>
          </article>
        } @empty {
          <p class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
            No se encontraron áreas.
          </p>
        }
      </section>

      <nav class="mt-7 flex items-center justify-between gap-4" aria-label="Paginación de áreas">
        <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40" type="button" [disabled]="meta().page <= 1" (click)="changePage(meta().page - 1)">
          Anterior
        </button>
        <span class="text-sm text-slate-600">{{ rangeLabel() }}</span>
        <button class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-40" type="button" [disabled]="meta().page >= meta().totalPages" (click)="changePage(meta().page + 1)">
          Siguiente
        </button>
      </nav>
    }
  `,
})
export class AreasPageComponent {
  private readonly api = inject(CatalogApiService);

  readonly items = signal<readonly CatalogArea[]>([]);
  readonly meta = signal<PageMetadata>(initialMeta);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly rangeLabel = () => pageRangeLabel(this.meta());

  constructor() {
    this.load(1);
  }

  applySearch(value: string): void {
    this.search.set(value.trim());
    this.load(1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.meta().totalPages) {
      this.load(page);
    }
  }

  private load(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .areas({ page, pageSize: 20, search: this.search() })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No fue posible cargar las áreas.');
          this.loading.set(false);
        },
      });
  }
}
