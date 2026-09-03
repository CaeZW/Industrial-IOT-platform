import { Component, computed, inject, signal } from '@angular/core';

import { HealthApiService } from '../../core/health-api.service';
import {
  dependencySummary,
  readinessLabel,
  type SystemStatus,
} from './system-status.model';

@Component({
  selector: 'app-system-status',
  template: `
    <section
      class="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1.5rem_4rem_rgb(15_23_42/0.08)] sm:p-9"
      aria-live="polite"
    >
      <div class="flex items-center justify-between gap-4">
        <div>
          <p
            class="mb-1 text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase"
          >
            Estado de la plataforma
          </p>
          <h2 class="text-xl font-bold text-slate-900 sm:text-2xl">
            {{ label() }}
          </h2>
        </div>
        <span
          class="size-3.5 rounded-full bg-amber-500 shadow-[0_0_0_0.45rem_rgb(245_158_11/0.15)] data-[status=ready]:bg-emerald-600 data-[status=ready]:shadow-[0_0_0_0.45rem_rgb(5_150_105/0.15)] data-[status=unavailable]:bg-red-600 data-[status=unavailable]:shadow-[0_0_0_0.45rem_rgb(220_38_38/0.15)]"
          [attr.data-status]="status()"
        ></span>
      </div>

      <p class="text-slate-600">{{ detail() }}</p>

      <button
        class="w-fit cursor-pointer rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-600/35 disabled:cursor-wait disabled:opacity-50"
        type="button"
        (click)="refresh()"
        [disabled]="status() === 'checking'"
      >
        Comprobar nuevamente
      </button>
    </section>
  `,
})
export class SystemStatusComponent {
  private readonly healthApi = inject(HealthApiService);

  readonly status = signal<SystemStatus>('checking');
  readonly detail = signal('Validando PostgreSQL y MQTT mediante NestJS…');
  readonly label = computed(() => readinessLabel(this.status()));

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.status.set('checking');
    this.detail.set('Validando PostgreSQL y MQTT mediante NestJS…');

    this.healthApi.readiness().subscribe({
      next: (response) => {
        this.status.set('ready');
        this.detail.set(dependencySummary(response));
      },
      error: () => {
        this.status.set('unavailable');
        this.detail.set(
          'Inicia la infraestructura local y la API para completar la comprobación.',
        );
      },
    });
  }
}
