import { Component } from '@angular/core';
@Component({
  selector: 'app-forbidden',
  template: `<section class="rounded-2xl border border-slate-200 bg-white p-8">
    <h1 class="text-3xl font-bold">Acceso restringido</h1>
    <p class="mt-4 text-slate-600">Tu cuenta no tiene permiso para ver esta sección. Consulta al administrador.</p>
  </section>`,
})
export class ForbiddenComponent {}

