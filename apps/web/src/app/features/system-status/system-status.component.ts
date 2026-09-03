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
    <section class="status-card" aria-live="polite">
      <div class="status-card__heading">
        <div>
          <p class="eyebrow">Estado de la plataforma</p>
          <h2>{{ label() }}</h2>
        </div>
        <span class="status-dot" [attr.data-status]="status()"></span>
      </div>

      <p>{{ detail() }}</p>

      <button type="button" (click)="refresh()" [disabled]="status() === 'checking'">
        Comprobar nuevamente
      </button>
    </section>
  `,
  styleUrl: './system-status.component.css',
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
