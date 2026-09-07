import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import type { DeviceReading } from '@industrial-iot-platform/contracts';
import { RealtimeService } from '../../core/realtime.service';
import { DeviceDataComponent } from './device-data.component';

describe('device live view', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('updates each live reading, preserves false/zero, keeps only sampled history and ignores other devices', async () => {
    const updates = new Subject<DeviceReading>(); const connections = new Subject<boolean>();
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'd1' })) } },
      { provide: RealtimeService, useValue: { deviceReadings: updates, connectionChanges: connections, isConnected: () => true } },
    ] });
    const fixture = TestBed.createComponent(DeviceDataComponent); const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/devices/d1/data').flush({ device: { id: 'd1', name: 'Device simulado', code: 'SIM', area: 'Test', persistenceIntervalSeconds: 300 }, latest: null, latestOrigin: 'NONE' });
    await Promise.resolve(); await Promise.resolve();
    http.expectOne('/api/devices/d1/history?page=1').flush({ items: [], page: 1, hasMore: false });
    await fixture.whenStable();
    const first: DeviceReading = { deviceId: 'd1', eventId: 'event1', eventTime: '2026-09-04T12:00:00Z', receivedAt: '2026-09-04T12:00:00Z', sourceType: 'MQTT_DIRECT', readings: { temperatura: 0, alarma: false }, persisted: true };
    updates.next(first); await fixture.whenStable();
    expect(fixture.componentInstance.latest()?.eventId).toBe('event1');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('false');
    expect(fixture.componentInstance.history().items).toHaveLength(1);
    updates.next({ ...first, eventId: 'event2', eventTime: '2026-09-04T12:00:02Z', persisted: false, readings: { temperatura: 23 } });
    expect(fixture.componentInstance.latest()?.readings['temperatura']).toBe(23);
    expect(fixture.componentInstance.history().items).toHaveLength(1);
    updates.next({ ...first, deviceId: 'other', eventId: 'other', eventTime: '2026-09-04T12:00:04Z' });
    expect(fixture.componentInstance.latest()?.eventId).toBe('event2');
    updates.next(first); expect(fixture.componentInstance.latest()?.eventId).toBe('event2');
    expect(fixture.componentInstance.history().items).toHaveLength(1);
    connections.next(false); await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('WebSocket desconectado');
    http.verify(); fixture.destroy();
  });
});
