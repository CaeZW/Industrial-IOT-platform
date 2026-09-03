import { Component } from '@angular/core';

import { SystemStatusComponent } from './features/system-status/system-status.component';

@Component({
  selector: 'app-root',
  imports: [SystemStatusComponent],
  template: `
    <main>
      <section class="hero">
        <p class="kicker">Alcos El Alto · Entorno local</p>
        <h1>Industrial IoT Platform</h1>
        <p class="intro">
          Base de supervisión para máquinas y dispositivos de planta. Angular se
          comunica exclusivamente con la API NestJS.
        </p>
      </section>

      <app-system-status />

      <footer>Sprint 1 · Fundación de aplicación</footer>
    </main>
  `,
  styleUrl: './app.component.css',
})
export class AppComponent {}
