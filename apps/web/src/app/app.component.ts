import { Component } from '@angular/core';

import { SystemStatusComponent } from './features/system-status/system-status.component';

@Component({
  selector: 'app-root',
  imports: [SystemStatusComponent],
  template: `
    <main
      class="mx-auto grid min-h-screen w-[min(100%-2rem,56rem)] content-start gap-10 py-12 sm:py-20 lg:py-28"
    >
      <section class="max-w-3xl">
        <p
          class="mb-3 text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase"
        >
          Alcos El Alto · Entorno local
        </p>
        <h1
          class="max-w-[12ch] text-5xl leading-[0.95] font-bold tracking-[-0.06em] text-slate-900 sm:text-7xl lg:text-8xl"
        >
          Industrial IoT Platform
        </h1>
        <p class="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-xl">
          Base de supervisión para máquinas y dispositivos de planta. Angular se
          comunica exclusivamente con la API NestJS.
        </p>
      </section>

      <app-system-status />

      <footer class="text-sm text-slate-500">
        Sprint 1 · Fundación de aplicación
      </footer>
    </main>
  `,
})
export class AppComponent {}
