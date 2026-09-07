import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import type { MachineDataView, MachineReading, MachineRunView } from '@industrial-iot-platform/contracts';
import { AuthService } from '../../core/auth/auth.service';
import { ManualProcessComponent, manualReadings } from './manual-process.component';
const machine: MachineDataView['machine'] = { id: 'm1', name: 'Caldero', code: 'M1', area: 'Test', persistenceIntervalSeconds: 300,
  runningKey: 'en_marcha', registrationMode: 'MANUAL', manualFormDefinition: [{ key: 'presion', label: 'Presión', type: 'number' }, { key: 'purga', label: 'Purga', type: 'boolean' }] };
const run: MachineRunView = { id: 'r1', origin: 'MANUAL', readingCount: 0, startedAt: '2026-09-04T12:00:00Z', finishedAt: '2026-09-04T13:00:00Z', lastHeartbeatAt: '2026-09-04T12:00:00Z', durationSeconds: 3600 };
const reading: MachineReading = { machineId: 'm1', eventId: 'e1', eventTime: run.startedAt, receivedAt: run.startedAt, readings: {}, sourceType: 'MANUAL', persisted: false, running: null, run };
function setup(allowed = true) {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(),
    { provide: AuthService, useValue: { has: () => allowed, session: signal({ user: { name: 'Responsable', roles: [allowed ? 'SUPERVISOR' : 'OPERATOR'] } }) } }] });
  const fixture = TestBed.createComponent(ManualProcessComponent); fixture.componentRef.setInput('machine', machine); fixture.detectChanges();
  return { fixture, http: TestBed.inject(HttpTestingController) };
}
describe('manual process form', () => {
  afterEach(() => { vi.useRealTimers(); TestBed.resetTestingModule(); });
  it('preserves zero and false and requires every configured value', () => {
    expect(manualReadings([{ key: 'presion', type: 'number', value: '0' }, { key: 'purga', type: 'boolean', value: 'false' }])).toEqual({ presion: 0, purga: false });
    expect(() => manualReadings([{ key: 'presion', type: 'number', value: '' }])).toThrow();
  });
  it('hides manual entry from Operator and automatic machines', () => {
    const denied = setup(false); expect((denied.fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull(); denied.fixture.destroy(); TestBed.resetTestingModule();
    const automatic = setup(); automatic.fixture.componentRef.setInput('machine', { ...machine, registrationMode: 'AUTOMATIC' }); automatic.fixture.detectChanges();
    expect((automatic.fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
  });
  it('creates the complete control first and then stores its full JSONB reading', async () => {
    const { fixture, http } = setup(); const form = fixture.componentInstance;
    form.startDate = '2026-09-04'; form.startTime = '08:00:00'; form.finishDate = '2026-09-04'; form.finishTime = '09:00:00'; form.submitControl();
    const control = http.expectOne('/api/machines/m1/manual-runs'); expect(control.request.body.readings).toBeUndefined();
    expect(Date.parse(control.request.body.finishedAt)).toBeGreaterThan(Date.parse(control.request.body.startedAt)); control.flush(reading); await fixture.whenStable();
    expect(form.selectedRun()?.id).toBe('r1'); form.fields[0]!.value = '0'; form.fields[1]!.value = 'false'; form.submitReading();
    const sample = http.expectOne('/api/machines/m1/manual-runs/r1/readings'); expect(sample.request.body.readings).toEqual({ presion: 0, purga: false });
    sample.flush({ ...reading, persisted: true, readings: { presion: 0, purga: false }, run: { ...run, readingCount: 1 } }); await fixture.whenStable();
    expect(form.message()).toContain('completo'); http.verify();
  });
  it('retries a lost response with the identical control payload', async () => {
    const { fixture, http } = setup(); const form = fixture.componentInstance; form.startDate = '2026-09-04'; form.startTime = '08:00'; form.finishDate = '2026-09-04'; form.finishTime = '09:00';
    form.submitControl(); const first = http.expectOne('/api/machines/m1/manual-runs'); const body = first.request.body; first.error(new ProgressEvent('error')); await fixture.whenStable();
    const retry = form.retry(); const second = http.expectOne('/api/machines/m1/manual-runs'); expect(second.request.body).toEqual(body); second.flush(reading); await retry; http.verify();
  });
  it('notifies the parent when cancelling a selected historical control', () => {
    const { fixture, http } = setup(); const cleared = vi.fn(); fixture.componentRef.setInput('targetRun', run); fixture.componentInstance.targetCleared.subscribe(cleared);
    fixture.componentInstance.clearRun(); expect(cleared).toHaveBeenCalledOnce(); http.verify();
  });
});
