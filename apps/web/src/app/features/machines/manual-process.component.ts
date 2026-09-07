import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { JsonObject, JsonValue, MachineDataView, MachineReading, MachineRunView, ManualProcessInput } from '@industrial-iot-platform/contracts';
import { AuthService } from '../../core/auth/auth.service';
export interface ManualField { key: string; label?: string; type: 'number' | 'text' | 'boolean' | 'json'; value: string }
export function manualReadings(fields: readonly ManualField[]): JsonObject {
  const result: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  for (const field of fields) {
    const key = field.key.trim(); if (!key || key.length > 120) throw new Error('Cada variable necesita un nombre válido.');
    if (Object.hasOwn(result, key)) throw new Error('No repitas nombres de variables.');
    let value: JsonValue;
    if (field.type === 'number') { if (!field.value.trim() || !Number.isFinite(Number(field.value))) throw new Error('Escribe un número válido en ' + (field.label ?? key) + '.'); value = Number(field.value); }
    else if (field.type === 'boolean') { if (!['true', 'false'].includes(field.value)) throw new Error('Selecciona Sí o No en ' + (field.label ?? key) + '.'); value = field.value === 'true'; }
    else if (field.type === 'json') { try { value = JSON.parse(field.value) as JsonValue; } catch { throw new Error('JSON inválido en ' + key + '.'); } }
    else value = field.value;
    result[key] = value;
  }
  if (!fields.length) throw new Error('La máquina no tiene variables manuales configuradas.');
  return result;
}
function timestamp(date: string, time: string, label: string): string {
  if (!date || !time) throw new Error('Completa fecha y hora de ' + label + '.');
  const value = new Date(date + 'T' + time); if (Number.isNaN(value.getTime())) throw new Error('Fecha u hora inválida.');
  return value.toISOString();
}
@Component({ selector: 'app-manual-process', imports: [FormsModule], templateUrl: './manual-process.component.html' })
export class ManualProcessComponent {
  readonly machine = input.required<MachineDataView['machine']>(); readonly targetRun = input<MachineRunView | null>(null);
  readonly saved = output<MachineReading>(); readonly targetCleared = output<void>(); readonly auth = inject(AuthService); private readonly http = inject(HttpClient);
  readonly canWrite = computed(() => this.auth.has('process.manual.write') && this.auth.has('machine.run.manual.manage') &&
    this.auth.session()?.user.roles.some((r) => ['ADMINISTRATOR', 'SUPERVISOR', 'MAINTENANCE'].includes(r)));
  readonly preparedRun = signal<MachineRunView | null>(null); readonly selectedRun = computed(() => this.preparedRun() ?? this.targetRun());
  readonly busy = signal(false); readonly error = signal(''); readonly message = signal('');
  readonly pending = signal<{ url: string; body: ManualProcessInput; action: 'control' | 'reading' } | null>(null);
  fields: ManualField[] = []; startDate = ''; startTime = ''; finishDate = ''; finishTime = '';
  constructor() { effect(() => { this.fields = this.machine().manualFormDefinition.map((f) => ({ ...f, value: '' })); }); }
  submitControl() {
    try {
      const startedAt = timestamp(this.startDate, this.startTime, 'inicio'); const finishedAt = timestamp(this.finishDate, this.finishTime, 'parada');
      if (Date.parse(finishedAt) <= Date.parse(startedAt)) throw new Error('La parada debe ser posterior al inicio.');
      this.begin('/api/machines/' + this.machine().id + '/manual-runs', { idempotencyKey: crypto.randomUUID(), startedAt, finishedAt }, 'control');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Revisa el control de horas.'); }
  }
  submitReading() {
    try { const run = this.selectedRun(); if (!run) throw new Error('Selecciona primero un control de horas.');
      this.begin('/api/machines/' + this.machine().id + '/manual-runs/' + run.id + '/readings',
        { idempotencyKey: crypto.randomUUID(), readings: manualReadings(this.fields) }, 'reading');
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Revisa los parámetros.'); }
  }
  private begin(url: string, body: ManualProcessInput, action: 'control' | 'reading') { if (this.busy() || this.pending()) return; this.error.set(''); this.message.set(''); this.pending.set({ url, body, action }); void this.retry(); }
  async retry() {
    const pending = this.pending(); if (!pending || this.busy()) return; this.busy.set(true); this.error.set('');
    try {
      const result = await firstValueFrom(this.http.post<MachineReading>(pending.url, pending.body)); this.pending.set(null);
      if (pending.action === 'control') { this.preparedRun.set(result.run); this.message.set('Control de horas guardado. Ahora completa los parámetros.'); }
      else { this.preparedRun.set(result.run); this.message.set('Registro completo guardado correctamente.'); this.fields = this.fields.map((f) => ({ ...f, value: '' })); }
      this.saved.emit(result);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status)) { this.pending.set(null); const body = error.error as { message?: string } | null; this.error.set(typeof body?.message === 'string' ? body.message : 'Registro rechazado. Revisa datos, permisos y solapamientos.'); }
      else this.error.set('No se pudo confirmar el guardado. Reintenta el mismo registro.');
    } finally { this.busy.set(false); }
  }
  clearRun() { this.preparedRun.set(null); this.targetCleared.emit(); this.message.set(''); this.error.set(''); }
}
