import { Component } from '@angular/core';

import { SystemStatusComponent } from '../system-status/system-status.component';

@Component({
  selector: 'app-home',
  imports: [SystemStatusComponent],
  template: `
    <section class="grid gap-10 py-8 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
      <div class="max-w-3xl">
        <p
          class="mb-3 text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase"
        >
          Alcos El Alto · Entorno local
        </p>
        <h1
          class="max-w-[12ch] text-5xl leading-[0.95] font-bold tracking-[-0.06em] text-slate-900 sm:text-7xl"
        >
          Industrial IoT Platform
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-xl">
          Supervisión centralizada de máquinas y dispositivos de planta mediante
          Angular, NestJS, PostgreSQL y MQTT.
        </p>
      </div>

      <app-system-status />
    </section>
  `,
})
export class HomeComponent {}
