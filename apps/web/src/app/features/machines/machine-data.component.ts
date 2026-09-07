import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import type { MachineDataView, MachineReading, MachineRunView, ProcessDataPage } from '@industrial-iot-platform/contracts';
import { RealtimeService } from '../../core/realtime.service';
import { ManualProcessComponent } from './manual-process.component';

export function formatRunDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map((n) => String(n).padStart(2, '0')).join(':');
}
@Component({
  selector: 'app-machine-data', imports: [DatePipe, JsonPipe, RouterLink, ManualProcessComponent],
  template: `
    <a class="text-emerald-800 underline" routerLink="/catalog/machines">Volver a máquinas</a>
    @if (error()) { <p role="alert" class="my-4 rounded-lg bg-red-50 p-4 text-red-800">{{ error() }}</p><button class="rounded-lg border p-3" (click)="load()">Reintentar</button> }
    @if (view(); as data) {
      <header class="my-6"><p class="text-sm font-semibold text-emerald-700">{{ data.machine.code }} · {{ data.machine.area }}</p>
        <h1 class="mt-2 text-3xl font-bold">{{ data.machine.name }}</h1>
        <p class="mt-3 text-slate-600">Supervisión de parámetros y control de horas. Esta pantalla no envía órdenes físicas.</p>
      </header>
      <section class="mb-6 grid gap-4 md:grid-cols-3">
        <article class="rounded-xl border bg-white p-5"><h2 class="text-sm font-semibold text-slate-500">Último estado recibido</h2>
          <p class="mt-3 text-2xl font-bold" [class.text-emerald-700]="running() === true">{{ running() === true ? 'En marcha' : running() === false ? 'Detenida' : 'Sin confirmar' }}</p>
          <p class="mt-2 text-sm">{{ connected() ? 'WebSocket conectado' : 'WebSocket desconectado' }}</p>
          @if (origin() !== 'LIVE') { <p class="mt-2 text-sm text-amber-800">Esperando una lectura nueva para confirmar el estado.</p> }
          @if (latest()?.sourceType === 'MANUAL') { <p class="mt-2 text-sm">Último registro manual; no confirma el estado físico de la máquina.</p> }
          @else if (origin() === 'LIVE' && latest()?.running === null) { <p class="mt-2 text-sm text-amber-800">La clave {{ data.machine.runningKey }} no contiene true/false. No se modifica el control de horas.</p> }
        </article>
        <article class="rounded-xl border bg-white p-5"><h2 class="text-sm font-semibold text-slate-500">Control de horas abierto</h2>
          @if (openRun(); as run) {
            @if (run.origin === 'MANUAL') {
              <p class="mt-3 text-2xl font-bold">Control manual abierto</p><p class="mt-2 text-sm">Inicio: {{ run.startedAt | date:'medium' }}</p>
              <p class="mt-2 text-sm">Iniciado por {{ run.startedBy?.name }}. La duración final se calcula al cierre explícito.</p>
            } @else {
              <p class="mt-3 font-mono text-3xl font-bold text-slate-900">{{ duration(run.durationSeconds) }}</p>
              <p class="mt-2 text-sm">Inicio: {{ run.startedAt | date:'medium' }}</p><p class="mt-1 text-sm">Heartbeat: {{ run.lastHeartbeatAt | date:'medium' }}</p>
              <p class="mt-2 text-xs text-slate-500">Duración confirmada hasta el último heartbeat; no aumenta sin nuevas lecturas.</p>
            }
          } @else { <p class="mt-3 text-lg">Sin ejecución abierta</p> }
        </article>
        <article class="rounded-xl border bg-white p-5"><h2 class="text-sm font-semibold text-slate-500">Parámetros de funcionamiento</h2>
          <p class="mt-3 text-lg font-bold">{{ variables().length }} variables</p><p class="mt-2 text-sm">Guardado cada {{ data.machine.persistenceIntervalSeconds / 60 }} min, solo en marcha.</p>
          <p class="mt-1 text-sm">Señal de marcha: <code>{{ data.machine.runningKey }}</code></p>
          @if (latest(); as reading) { <p class="mt-2 text-sm">Recibido hace {{ ageSeconds() }} s</p><p class="text-xs text-slate-500">{{ reading.eventTime | date:'medium' }}</p> }
        </article>
      </section>
      @if (origin() === 'HISTORY') { <p class="mb-4 rounded-lg bg-amber-50 p-4 text-amber-900">Variables de la última muestra histórica. No representan una lectura actual de la máquina.</p> }
      <app-manual-process [machine]="data.machine" [targetRun]="manualTargetRun()" (targetCleared)="manualTargetRun.set(null)" (saved)="manualSaved($event)" />
      <section aria-label="Variables actuales" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (variable of variables(); track variable.key) {
          <article class="min-w-0 rounded-xl border bg-white p-4"><h2 class="text-sm font-semibold text-emerald-800">{{ variable.key }}</h2><pre class="mt-3 whitespace-pre-wrap break-all text-lg">{{ variable.value }}</pre></article>
        } @empty { <p class="col-span-full rounded-xl border border-dashed p-6 text-slate-500">Todavía no hay variables recibidas.</p> }
      </section>
      <section class="mt-8 rounded-xl border bg-white p-5">
        <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold">Encendidos y apagados recientes</h2><button class="rounded-lg border px-4 py-2" (click)="load()">Actualizar</button></div>
        <p class="my-3 text-sm text-slate-500">Últimos 10 controles. Los parámetros guardados están vinculados a cada ejecución.</p>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Encendido / Inicio</th><th>Apagado / Parada</th><th>Tiempo</th><th>Parámetros</th></tr></thead><tbody>
          @for (run of runs(); track run.id) {
            <tr class="border-b"><td class="py-3 pr-4 whitespace-nowrap">{{ run.startedAt | date:'medium' }}<p class="text-xs text-slate-500">{{ run.origin === 'MANUAL' ? 'Manual · ' + (run.startedBy?.name ?? '') : 'Automático' }}</p></td><td class="py-3 pr-4 whitespace-nowrap">{{ run.finishedAt ? (run.finishedAt | date:'medium') : 'Abierto' }}<p class="text-xs text-slate-500">{{ run.closedBy?.name }}</p></td><td class="py-3 pr-4 font-mono">{{ run.origin === 'MANUAL' && !run.finishedAt ? 'Pendiente de cierre' : duration(run.durationSeconds) }}</td><td><button class="mr-3 text-emerald-800 underline" (click)="showSamples(run)">Ver parámetros</button>@if (run.origin === 'MANUAL' && !run.readingCount) { <button class="text-amber-800 underline" (click)="manualTargetRun.set(run)">Registrar parámetros</button> }</td></tr>
          } @empty { <tr><td colspan="4" class="py-6 text-slate-500">Aún no hay controles de horas.</td></tr> }
        </tbody></table></div>
      </section>
      @if (selectedRun(); as run) {
        <section class="mt-6 rounded-xl border bg-white p-5"><div class="flex justify-between gap-4"><h2 class="font-bold">Parámetros del control iniciado {{ run.startedAt | date:'medium' }}</h2><button class="text-emerald-800 underline" (click)="closeSamples()">Cerrar</button></div>
          @if (samplesError()) { <p role="alert" class="my-3 text-red-800">{{ samplesError() }}</p> }
          @if (samplesBusy()) { <p class="py-4">Cargando parámetros…</p> }
          @for (sample of samples().items; track sample.eventId) { <details class="my-3 rounded-lg border p-3"><summary class="cursor-pointer">{{ sample.eventTime | date:'medium' }} · {{ sample.sourceType }} · {{ sample.responsible?.name }}</summary><pre class="mt-3 whitespace-pre-wrap break-all">{{ sample.readings | json }}</pre></details> }
          @if (!samplesBusy() && !samples().items.length && !samplesError()) { <p class="py-4">Sin muestras para este control.</p> }
          <nav aria-label="Parámetros del control" class="mt-4 flex items-center justify-between"><button class="rounded-lg border p-2 disabled:opacity-40" [disabled]="samples().page <= 1 || samplesBusy()" (click)="loadSamples(samples().page - 1)">Anterior</button><span>Página {{ samples().page }}</span><button class="rounded-lg border p-2 disabled:opacity-40" [disabled]="!samples().hasMore || samplesBusy()" (click)="loadSamples(samples().page + 1)">Siguiente</button></nav>
        </section>
      }
    } @else if (!error()) { <p role="status" class="py-8">Cargando máquina…</p> }
  `,
})
export class MachineDataComponent {
  private readonly http = inject(HttpClient); private readonly realtime = inject(RealtimeService); private readonly route = inject(ActivatedRoute);
  private id = ''; private disposed = false; private requestId = 0; private samplesRequestId = 0;
  readonly view = signal<MachineDataView | null>(null); readonly latest = signal<MachineReading | null>(null);
  readonly origin = signal<'LIVE' | 'HISTORY' | 'NONE'>('NONE'); readonly runs = signal<readonly MachineRunView[]>([]);
  readonly connected = signal(this.realtime.isConnected()); readonly error = signal('');
  readonly selectedRun = signal<MachineRunView | null>(null); readonly samples = signal<ProcessDataPage>({ items: [], page: 1, hasMore: false });
  readonly samplesError = signal(''); readonly samplesBusy = signal(false);
  readonly manualTargetRun = signal<MachineRunView | null>(null);
  private readonly now = signal(Date.now());
  readonly running = computed(() => this.origin() === 'LIVE' ? this.latest()?.running ?? null : null);
  readonly openRun = computed(() => this.runs().find((r) => !r.finishedAt) ?? null);
  readonly variables = computed(() => Object.entries(this.latest()?.readings ?? {}).map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value, null, 2) })));
  readonly ageSeconds = computed(() => Math.max(0, Math.floor((this.now() - Date.parse(this.latest()?.receivedAt ?? new Date(this.now()).toISOString())) / 1000)));
  readonly duration = formatRunDuration;
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => { this.disposed = true; clearInterval(timer); });
    this.realtime.machineReadings.pipe(takeUntilDestroyed()).subscribe((reading) => {
      if (reading.machineId !== this.id) return;
      if (reading.sourceType === 'MANUAL' && !reading.persisted) {
        if (reading.run) this.mergeRuns([reading.run]);
      } else if (this.accept(reading, 'LIVE') && reading.run) this.mergeRuns([reading.run]);
      if (reading.persisted && this.selectedRun()?.id === reading.run?.id && this.samples().page === 1) void this.loadSamples(1);
    });
    this.realtime.connectionChanges.pipe(takeUntilDestroyed()).subscribe((connected) => { this.connected.set(connected); if (connected && this.id) void this.load(); });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('id') ?? ''; this.view.set(null); this.latest.set(null); this.runs.set([]); this.origin.set('NONE'); this.manualTargetRun.set(null); this.closeSamples(); void this.load();
    });
  }
  private accept(reading: MachineReading, origin: 'LIVE' | 'HISTORY'): boolean {
    if (this.latest() && Date.parse(reading.eventTime) < Date.parse(this.latest()!.eventTime)) return false;
    this.latest.set(reading); this.origin.set(origin); return true;
  }
  private mergeRuns(rows: readonly MachineRunView[]) {
    const merged = new Map(this.runs().map((r) => [r.id, r]));
    for (const row of rows) {
      const old = merged.get(row.id);
      if (old?.finishedAt && !row.finishedAt) continue;
      if (!old || Date.parse(row.finishedAt ?? row.lastHeartbeatAt) >= Date.parse(old.finishedAt ?? old.lastHeartbeatAt)) merged.set(row.id, row);
    }
    this.runs.set([...merged.values()].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, 10));
  }
  async load() {
    const id = this.id; if (!id) return; const request = ++this.requestId; this.error.set('');
    try {
      const data = await firstValueFrom(this.http.get<MachineDataView>('/api/machines/' + id + '/data'));
      if (request !== this.requestId || this.disposed) return;
      this.view.set(data); this.mergeRuns(data.runs);
      if (data.latest) this.accept(data.latest, data.latestOrigin === 'LIVE' ? 'LIVE' : 'HISTORY');
    } catch { if (request === this.requestId && !this.disposed) { this.error.set('No se pudo consultar la máquina. Comprueba conexión y permisos.'); this.view.set(null); this.latest.set(null); this.runs.set([]); this.closeSamples(); } }
  }
  showSamples(run: MachineRunView) { this.selectedRun.set(run); this.samples.set({ items: [], page: 1, hasMore: false }); void this.loadSamples(1); }
  manualSaved(reading: MachineReading) { if (reading.persisted) this.accept(reading, 'LIVE'); if (reading.run) this.mergeRuns([reading.run]); this.manualTargetRun.set(null); void this.load(); if (this.selectedRun()) void this.loadSamples(1); }
  closeSamples() { this.samplesRequestId++; this.selectedRun.set(null); this.samples.set({ items: [], page: 1, hasMore: false }); this.samplesError.set(''); }
  async loadSamples(page: number) {
    const run = this.selectedRun(); if (!run) return; const request = ++this.samplesRequestId;
    this.samplesBusy.set(true); this.samplesError.set('');
    try {
      const rows = await firstValueFrom(this.http.get<ProcessDataPage>('/api/machines/' + this.id + '/runs/' + run.id + '/readings', { params: { page } }));
      if (request === this.samplesRequestId && !this.disposed) this.samples.set(rows);
    } catch { if (request === this.samplesRequestId) this.samplesError.set('No se pudieron consultar los parámetros del control.'); }
    finally { if (request === this.samplesRequestId) this.samplesBusy.set(false); }
  }
}
