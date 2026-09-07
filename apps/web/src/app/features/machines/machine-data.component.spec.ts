import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import type { MachineReading, MachineRunView } from '@industrial-iot-platform/contracts';
import { RealtimeService } from '../../core/realtime.service';
import { AuthService } from '../../core/auth/auth.service';
import { MachineDataComponent, formatRunDuration } from './machine-data.component';

describe('machine dashboard', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('formats confirmed durations without wrapping after 24 hours', () => { expect(formatRunDuration(90061)).toBe('25:01:01'); expect(formatRunDuration(0)).toBe('00:00:00'); });
  it('shows variables on OFF, one open run on ON, heartbeat duration and recent stops without polling all process data', async () => {
    const updates = new Subject<MachineReading>(); const connections = new Subject<boolean>();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: AuthService, useValue: { has: () => false, session: () => null } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'm1' })) } },
      { provide: RealtimeService, useValue: { machineReadings: updates, connectionChanges: connections, isConnected: () => true } },
    ] });
    const fixture = TestBed.createComponent(MachineDataComponent); const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/machines/m1/data').flush({ machine: { id: 'm1', name: 'Máquina simulada', code: 'SIM', area: 'Test', persistenceIntervalSeconds: 300, runningKey: 'en_marcha', registrationMode: 'AUTOMATIC', manualFormDefinition: [] }, latest: null, latestOrigin: 'NONE', runs: [] });
    await fixture.whenStable();
    const base: MachineReading = { machineId: 'm1', eventId: 'off1', eventTime: '2026-09-04T12:00:00Z', receivedAt: '2026-09-04T12:00:00Z', sourceType: 'MQTT_DIRECT', readings: { presion: 0, alarma: false }, persisted: false, running: false, run: null };
    updates.next(base); await fixture.whenStable();
    expect(fixture.componentInstance.running()).toBe(false); expect((fixture.nativeElement as HTMLElement).textContent).toContain('Detenida');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('false');
    const run: MachineRunView = { id: 'r1', startedAt: '2026-09-04T12:00:02Z', finishedAt: null, lastHeartbeatAt: '2026-09-04T12:00:02Z', durationSeconds: 0 };
    updates.next({ ...base, eventId: 'on1', eventTime: run.startedAt, running: true, persisted: true, run });
    updates.next({ ...base, eventId: 'on2', eventTime: '2026-09-04T12:00:12Z', running: true, run: { ...run, lastHeartbeatAt: '2026-09-04T12:00:12Z', durationSeconds: 10 } });
    expect(fixture.componentInstance.runs()).toHaveLength(1); expect(fixture.componentInstance.openRun()?.durationSeconds).toBe(10);
    updates.next({ ...base, eventId: 'off2', eventTime: '2026-09-04T12:00:15Z', run: { ...run, lastHeartbeatAt: '2026-09-04T12:00:12Z', finishedAt: '2026-09-04T12:00:15Z', durationSeconds: 13 } });
    await fixture.whenStable(); expect(fixture.componentInstance.openRun()).toBeNull(); expect(fixture.componentInstance.runs()).toHaveLength(1);
    updates.next({ ...base, eventId: 'old', eventTime: run.startedAt, running: true, run });
    expect(fixture.componentInstance.openRun()).toBeNull();
    http.expectNone((request) => request.url.includes('/readings'));
    fixture.componentInstance.showSamples(fixture.componentInstance.runs()[0]!);
    http.expectOne('/api/machines/m1/runs/r1/readings?page=1').flush({ items: [], page: 1, hasMore: false });
    await fixture.whenStable();
    const manual = { ...run, id: 'manual', origin: 'MANUAL' as const, startedAt: '2026-09-04T13:00:00Z' };
    updates.next({ ...base, eventId: 'manual1', eventTime: manual.startedAt, sourceType: 'MANUAL', persisted: true, running: null, readings: { temperature: 27 }, run: manual });
    updates.next({ ...base, eventId: 'manual-close', eventTime: '2026-09-04T13:10:00Z', sourceType: 'MANUAL', persisted: false,
      readings: {}, run: { ...manual, finishedAt: '2026-09-04T13:10:00Z', durationSeconds: 600 } });
    expect(fixture.componentInstance.latest()?.readings).toEqual({ temperature: 27 });
    expect(fixture.componentInstance.openRun()).toBeNull();
    http.verify(); fixture.destroy();
  });
});
