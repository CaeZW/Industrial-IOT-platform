import { Component, inject, signal } from '@angular/core';
import type { OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EquipmentSetting } from '@industrial-iot-platform/contracts';
import { AdministrationApi, administrationError } from './administration-api.service';
import { AdministrationNavComponent } from './administration-nav.component';

@Component({
  selector: 'app-equipment-settings', imports: [FormsModule, AdministrationNavComponent],
  template: `
    <app-administration-nav />
    <h1 class="text-3xl font-bold">Configuración de equipos</h1>
    <p class="my-3 text-slate-600">Cada equipo conserva su propio intervalo. No cambia la frecuencia de publicación de Node-RED ni la actualización del dashboard.</p>
    <p class="my-4 rounded-lg bg-emerald-50 p-4 text-emerald-900">Los intervalos se aplican a las lecturas MQTT de máquinas y devices. Las máquinas guardan parámetros solo en marcha y actualizan el heartbeat con cada lectura válida.</p>
    @if (error()) { <p role="alert" class="my-4 rounded-lg bg-red-50 p-4 text-red-800">{{ error() }}</p> }
    @if (notice()) { <p role="status" class="my-4 rounded-lg bg-emerald-50 p-4">{{ notice() }}</p> }
    @if (loading()) { <p role="status">Cargando equipos…</p> }
    @else {
      <div class="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section class="min-w-0 rounded-xl border bg-white p-4">
          <div class="flex flex-wrap gap-3">
            <label>Tipo<select class="mt-1 block rounded-lg border p-2" [(ngModel)]="kind"><option value="">Todos</option><option value="machine">Máquinas</option><option value="device">Devices</option></select></label>
            <label class="grow">Buscar<input class="mt-1 block w-full rounded-lg border p-2" [(ngModel)]="search" placeholder="Equipo, código o área" /></label>
          </div>
          <p class="my-3 text-sm text-slate-500">{{ filtered().length }} equipos</p>
          <div class="max-h-[36rem] overflow-y-auto">
            @for (equipment of filtered(); track equipment.kind + equipment.id) {
              <button type="button" class="mb-2 block w-full rounded-lg border p-3 text-left hover:bg-emerald-50 disabled:opacity-50" [class.bg-emerald-50]="selected()?.id === equipment.id" [disabled]="busy()" (click)="select(equipment)">
                <strong>{{ equipment.name }}</strong><span class="float-right text-sm">{{ equipment.persistenceIntervalSeconds / 60 }} min</span>
                <span class="block text-sm text-slate-500">{{ equipment.kind === 'machine' ? 'Máquina' : 'Device' }} · {{ equipment.code }} · {{ equipment.area }}</span>
              </button>
            } @empty { <p class="py-8">No hay equipos que coincidan dentro de tu acceso.</p> }
          </div>
        </section>
        @if (selected(); as equipment) {
          <form #form="ngForm" (ngSubmit)="save()" class="h-fit rounded-xl border bg-white p-6">
            <fieldset [disabled]="busy()" class="space-y-4">
              <legend class="mb-3 text-xl font-bold">{{ equipment.name }}</legend>
              <label class="block">Intervalo de guardado (minutos)<input class="mt-1 w-full rounded-lg border p-2" type="number" name="minutes" [(ngModel)]="minutes" required min="0.016666666666666666" max="1440" step="any" /></label>
              <p class="text-sm text-slate-600">Predeterminado: 5 minutos. Entre 1 segundo y 24 horas; debe equivaler a segundos enteros.</p>
              @if (equipment.kind === 'machine') {
                <label class="block">Clave de funcionamiento<input class="mt-1 w-full rounded-lg border p-2 font-mono" name="runningKey" [(ngModel)]="runningKey" required maxlength="120" /></label>
                <p class="text-sm text-slate-600">Ejemplo: en_marcha o arranque. Clave literal del JSON con valor true/false. Las lecturas solo se guardarán durante el funcionamiento; el heartbeat se actualizará con cada lectura válida.</p>
              } @else { <p class="text-sm text-slate-600">Este device no tiene control de horas. Sus lecturas se guardarán al intervalo seleccionado.</p> }
              <button type="submit" class="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50" [disabled]="form.invalid || busy()">{{ busy() ? 'Guardando…' : 'Guardar configuración' }}</button>
            </fieldset>
          </form>
        } @else { <p class="rounded-xl border border-dashed p-8 text-slate-500">Selecciona un equipo para configurar su intervalo.</p> }
      </div>
    }
  `,
})
export class EquipmentSettingsComponent implements OnInit {
  private readonly api = inject(AdministrationApi);
  readonly equipment = signal<EquipmentSetting[]>([]); readonly selected = signal<EquipmentSetting | null>(null);
  readonly loading = signal(true); readonly busy = signal(false); readonly error = signal(''); readonly notice = signal('');
  search = ''; kind = ''; minutes = 5; runningKey = 'en_marcha';
  ngOnInit() { void this.load(); }
  async load() {
    this.loading.set(true);
    try { this.equipment.set(await this.api.equipment()); }
    catch (error) { this.error.set(administrationError(error)); }
    finally { this.loading.set(false); }
  }
  filtered() { const q = this.search.toLocaleLowerCase(); return this.equipment().filter((e) => (!this.kind || e.kind === this.kind) && (e.name + ' ' + e.code + ' ' + e.area).toLocaleLowerCase().includes(q)); }
  select(equipment: EquipmentSetting) { this.selected.set(equipment); this.minutes = equipment.persistenceIntervalSeconds / 60; this.runningKey = equipment.runningKey ?? ''; this.notice.set(''); this.error.set(''); }
  async save() {
    const equipment = this.selected(); if (!equipment || this.busy()) return;
    if (equipment.kind === 'machine' && !this.runningKey.trim()) { this.error.set('La clave de funcionamiento no puede estar vacía.'); return; }
    const rawSeconds = this.minutes * 60; const seconds = Math.round(rawSeconds);
    if (!Number.isFinite(rawSeconds) || seconds < 1 || seconds > 86400 || Math.abs(rawSeconds - seconds) > 0.000001) { this.error.set('El intervalo debe equivaler a segundos enteros, entre 1 y 86400.'); return; }
    if (!window.confirm('¿Guardar la configuración de ' + equipment.name + '?')) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    try {
      await this.api.saveEquipment(equipment, seconds, this.runningKey);
      const updated = { ...equipment, persistenceIntervalSeconds: seconds, runningKey: equipment.kind === 'machine' ? this.runningKey : null };
      this.equipment.update((rows) => rows.map((row) => row.id === updated.id && row.kind === updated.kind ? updated : row));
      this.selected.set(updated); this.notice.set('Configuración guardada para este equipo.');
    } catch (error) { this.error.set(administrationError(error)); }
    finally { this.busy.set(false); }
  }
}
