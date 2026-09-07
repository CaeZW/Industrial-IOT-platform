import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import type { DeviceDataView, DeviceHistoryPage, DeviceReading } from '@industrial-iot-platform/contracts';
import { RealtimeService } from '../../core/realtime.service';

@Component({
  selector: 'app-device-data', imports: [DatePipe, JsonPipe, RouterLink],
  template: `
    <a class="text-emerald-800 underline" routerLink="/catalog/devices">Volver a dispositivos</a>
    @if (error()) { <p role="alert" class="my-4 rounded-lg bg-red-50 p-4 text-red-800">{{ error() }}</p><button class="rounded-lg border p-3" (click)="load()">Reintentar</button> }
    @if (view(); as data) {
      <header class="my-6"><p class="text-sm text-emerald-700">{{ data.device.code }} · {{ data.device.area }}</p>
        <h1 class="mt-2 text-3xl font-bold">{{ data.device.name }}</h1>
        <p class="mt-3 text-slate-600">Histórico: cada {{ data.device.persistenceIntervalSeconds / 60 }} minutos. La pantalla recibe cada lectura nueva.</p>
      </header>
      <section class="mb-6 rounded-xl border bg-white p-5">
        <p class="font-semibold" [class.text-emerald-700]="connected()" [class.text-amber-700]="!connected()">{{ connected() ? 'WebSocket conectado' : 'WebSocket desconectado: los datos no se actualizan' }}</p>
        @if (latest(); as reading) {
          <p class="mt-2 text-sm">{{ origin() === 'HISTORY' ? 'Última muestra guardada; esperando datos en vivo.' : 'Última lectura recibida por NestJS.' }}</p>
          <p class="text-sm text-slate-600">Fecha del dato: {{ reading.eventTime | date:'medium' }} · Recibido: {{ reading.receivedAt | date:'medium' }} · Hace {{ ageSeconds() }} s</p>
          <p class="text-sm text-slate-600">{{ reading.persisted ? 'Esta lectura está guardada en el histórico.' : 'Lectura en vivo; aún no corresponde otro guardado histórico.' }}</p>
        } @else { <p class="mt-2 text-slate-600">Todavía no se han recibido lecturas para este device.</p> }
      </section>
      <section aria-label="Variables actuales" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        @for (variable of variables(); track variable.key) {
          <article class="min-w-0 rounded-xl border bg-white p-5"><h2 class="font-semibold text-emerald-800">{{ variable.key }}</h2><pre class="mt-3 whitespace-pre-wrap break-all text-lg">{{ variable.value }}</pre></article>
        }
      </section>
      <section class="mt-8 rounded-xl border bg-white p-5">
        <div class="flex flex-wrap items-center justify-between gap-3"><h2 class="text-xl font-bold">Lecturas guardadas</h2><button class="rounded-lg border px-4 py-2 disabled:opacity-50" [disabled]="historyBusy()" (click)="loadHistory(1)">Actualizar histórico</button></div>
        <p class="my-3 text-sm text-slate-500">20 registros por página. Fechas mostradas en la zona horaria del navegador.</p>
        @if (historyError()) { <p role="alert" class="my-3 text-red-800">{{ historyError() }}</p> }
        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b"><th class="py-3">Fecha de lectura</th><th>Recepción</th><th>Origen / JSONB</th></tr></thead><tbody>
          @for (reading of history().items; track reading.eventId) {
            <tr class="border-b align-top"><td class="py-3 pr-4 whitespace-nowrap">{{ reading.eventTime | date:'medium' }}</td><td class="py-3 pr-4 whitespace-nowrap">{{ reading.receivedAt | date:'medium' }}</td><td class="py-3"><details><summary class="cursor-pointer text-emerald-800">{{ reading.sourceType }} · Ver variables</summary><pre class="mt-2 max-w-lg whitespace-pre-wrap break-all">{{ reading.readings | json }}</pre></details></td></tr>
          } @empty { <tr><td colspan="3" class="py-6 text-slate-500">Sin registros guardados.</td></tr> }
        </tbody></table></div>
        <nav aria-label="Paginación del histórico" class="mt-4 flex items-center justify-between"><button class="rounded-lg border p-2 disabled:opacity-40" [disabled]="history().page <= 1 || historyBusy()" (click)="loadHistory(history().page - 1)">Anterior</button><span>Página {{ history().page }}</span><button class="rounded-lg border p-2 disabled:opacity-40" [disabled]="!history().hasMore || historyBusy()" (click)="loadHistory(history().page + 1)">Siguiente</button></nav>
      </section>
    } @else if (!error()) { <p role="status" class="py-8">Cargando device…</p> }
  `,
})
export class DeviceDataComponent {
  private readonly http = inject(HttpClient); private readonly realtime = inject(RealtimeService);
  private readonly destroy = inject(DestroyRef); private readonly route = inject(ActivatedRoute);
  private id = ''; private historyRequest = 0; private disposed = false;
  readonly view = signal<DeviceDataView | null>(null); readonly latest = signal<DeviceReading | null>(null);
  readonly origin = signal<'LIVE' | 'HISTORY' | 'NONE'>('NONE');
  readonly connected = signal(this.realtime.isConnected()); readonly error = signal('');
  readonly historyError = signal(''); readonly historyBusy = signal(false);
  readonly history = signal<DeviceHistoryPage>({ items: [], page: 1, hasMore: false });
  private readonly now = signal(Date.now());
  readonly ageSeconds = computed(() => Math.max(0, Math.floor((this.now() - Date.parse(this.latest()?.receivedAt ?? new Date(this.now()).toISOString())) / 1000)));
  readonly variables = computed(() => Object.entries(this.latest()?.readings ?? {}).map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value, null, 2) })));
  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroy.onDestroy(() => { this.disposed = true; clearInterval(timer); });
    this.realtime.deviceReadings.pipe(takeUntilDestroyed()).subscribe((reading) => {
      if (reading.deviceId !== this.id) return;
      this.accept(reading, 'LIVE');
      if (reading.persisted && this.history().page === 1) this.mergeHistory([reading]);
    });
    this.realtime.connectionChanges.pipe(takeUntilDestroyed()).subscribe((connected) => {
      this.connected.set(connected); if (connected && this.id) void this.load();
    });
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('id') ?? ''; this.view.set(null); this.latest.set(null); this.origin.set('NONE');
      this.history.set({ items: [], page: 1, hasMore: false }); void this.load();
    });
  }
  private accept(reading: DeviceReading, origin: 'LIVE' | 'HISTORY') {
    if (!this.latest() || Date.parse(reading.eventTime) >= Date.parse(this.latest()!.eventTime)) { this.latest.set(reading); this.origin.set(origin); }
  }
  private mergeHistory(items: readonly DeviceReading[]) {
    const merged = [...new Map([...this.history().items, ...items].map((r) => [r.eventId, r])).values()].sort((a, b) => b.eventTime.localeCompare(a.eventTime));
    this.history.set({ items: merged.slice(0, 20), page: 1, hasMore: this.history().hasMore || merged.length > 20 });
  }
  async load() {
    const id = this.id; if (!id) return; this.error.set('');
    try {
      const view = await firstValueFrom(this.http.get<DeviceDataView>('/api/devices/' + id + '/data'));
      if (id !== this.id || this.disposed) return;
      this.view.set(view); if (view.latest) this.accept(view.latest, view.latestOrigin === 'LIVE' ? 'LIVE' : 'HISTORY');
      await this.loadHistory(1);
    } catch { if (id === this.id && !this.disposed) { this.error.set('No se pudo consultar el device. Comprueba conexión y permisos.'); this.view.set(null); this.latest.set(null); this.history.set({ items: [], page: 1, hasMore: false }); } }
  }
  async loadHistory(page: number) {
    const id = this.id; const request = ++this.historyRequest;
    this.historyBusy.set(true); this.historyError.set('');
    try {
      const result = await firstValueFrom(this.http.get<DeviceHistoryPage>('/api/devices/' + id + '/history', { params: { page } }));
      if (id !== this.id || request !== this.historyRequest || this.disposed) return;
      const live = this.latest();
      this.history.set(result);
      if (page === 1 && live?.persisted) this.mergeHistory([live]);
    } catch { if (id === this.id && !this.disposed) this.historyError.set('No se pudo actualizar el histórico.'); }
    finally { if (request === this.historyRequest) this.historyBusy.set(false); }
  }
}
