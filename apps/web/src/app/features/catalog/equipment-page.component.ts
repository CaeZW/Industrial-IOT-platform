import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type {
  CatalogArea,
  CatalogEquipment,
  EquipmentKind,
  PageMetadata,
} from '@industrial-iot-platform/contracts';

import { CatalogApiService } from '../../core/catalog-api.service';
import { equipmentPlural, pageRangeLabel } from './catalog-view.model';

const initialMeta: PageMetadata = {
  page: 1,
  pageSize: 12,
  totalItems: 0,
  totalPages: 0,
};

@Component({
  selector: 'app-equipment-page',
  imports: [RouterLink],
  template: `
    <header class="mb-8">
      <p class="text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase">
        Inventario de planta
      </p>
      <h1 class="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        {{ title() }}
      </h1>
      <p class="mt-3 text-slate-600">
        Consulta de solo lectura con código estable y ubicación operativa.
      </p>
    </header>

    <section class="mb-6 grid gap-3 md:grid-cols-[1fr_15rem_auto]">
      <label class="sr-only" for="equipment-search">Buscar {{ title().toLowerCase() }}</label>
      <input
        #searchInput
        id="equipment-search"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15"
        type="search"
        maxlength="100"
        placeholder="Nombre, código o descripción"
        [value]="search()"
        (keyup.enter)="applyFilters(searchInput.value, areaSelect.value)"
      />

      <label class="sr-only" for="area-filter">Filtrar por área</label>
      <select
        #areaSelect
        id="area-filter"
        class="rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-emerald-600 focus:ring-3 focus:ring-emerald-600/15"
        [value]="areaId()"
      >
        <option value="">Todas las áreas</option>
        @for (area of areas(); track area.id) {
          <option [value]="area.id">{{ area.name }}</option>
        }
      </select>

      <button
        class="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
        type="button"
        (click)="applyFilters(searchInput.value, areaSelect.value)"
      >
        Aplicar
      </button>
    </section>

    @if (loading()) {
      <p class="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
        Cargando {{ title().toLowerCase() }}…
      </p>
    } @else if (error()) {
      <p class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        {{ error() }}
      </p>
    } @else {
      <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        @for (item of items(); track item.id) {
          <article class="flex min-h-60 flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <p class="font-mono text-xs font-bold text-emerald-700">
                {{ item.code ?? 'SIN-CÓDIGO' }}
              </p>
              <span class="rounded-full px-2.5 py-1 text-xs font-semibold" [class.bg-emerald-50]="item.isActive" [class.text-emerald-800]="item.isActive" [class.bg-slate-100]="!item.isActive" [class.text-slate-600]="!item.isActive">
                {{ item.isActive ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <h2 class="mt-3 text-xl font-bold text-slate-900">{{ item.name }}</h2>
            @if (kind() === 'device') { <a class="mt-2 text-sm font-semibold text-emerald-800 underline" [routerLink]="['/devices', item.id]">Ver lecturas e histórico</a> }
            @else { <a class="mt-2 text-sm font-semibold text-emerald-800 underline" [routerLink]="['/machines', item.id]">Ver parámetros y control de horas</a> }
            <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
              {{ item.description ?? 'Sin descripción' }}
            </p>
            <div class="mt-auto border-t border-slate-100 pt-4 text-sm text-slate-500">
              <p class="font-semibold text-slate-700">{{ item.area.name }}</p>
              <p>{{ item.plant.name }} · ID legado {{ item.legacyId ?? '—' }}</p>
            </div>
          </article>
        } @empty {
          <p class="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
            No se encontraron {{ title().toLowerCase() }}.
          </p>
        }
      </section>

      <nav class="mt-7 flex items-center justify-between gap-4" [attr.aria-label]="'Paginación de ' + title().toLowerCase()">
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
export class EquipmentPageComponent {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);

  readonly kind = signal<EquipmentKind>(this.routeKind());
  readonly title = computed(() => equipmentPlural(this.kind()));
  readonly items = signal<readonly CatalogEquipment[]>([]);
  readonly areas = signal<readonly CatalogArea[]>([]);
  readonly meta = signal<PageMetadata>(initialMeta);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly areaId = signal('');
  readonly rangeLabel = () => pageRangeLabel(this.meta());

  constructor() {
    this.loadAreas();
    this.load(1);
  }

  applyFilters(search: string, areaId: string): void {
    this.search.set(search.trim());
    this.areaId.set(areaId);
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
      .equipment(this.kind(), {
        page,
        pageSize: 12,
        search: this.search(),
        ...(this.areaId().length === 0 ? {} : { areaId: this.areaId() }),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.meta.set(result.meta);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(`No fue posible cargar ${this.title().toLowerCase()}.`);
          this.loading.set(false);
        },
      });
  }

  private loadAreas(): void {
    this.api.areas({ page: 1, pageSize: 50 }).subscribe({
      next: (result) => this.areas.set(result.items),
      error: () => this.areas.set([]),
    });
  }

  private routeKind(): EquipmentKind {
    return this.route.snapshot.data['kind'] === 'device' ? 'device' : 'machine';
  }
}
