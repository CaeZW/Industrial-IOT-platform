import { Injectable } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import type { DeviceReading, MachineReading } from '@industrial-iot-platform/contracts';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  readonly deviceReadings = new Subject<DeviceReading>();
  readonly machineReadings = new Subject<MachineReading>();
  readonly connectionChanges = new Subject<boolean>();
  private readonly socket: Socket = io('/realtime', {
    autoConnect: false,
    transports: ['websocket'],
  });
  constructor() {
    this.socket.on('device.reading', (reading: DeviceReading) => this.deviceReadings.next(reading));
    this.socket.on('machine.reading', (reading: MachineReading) => this.machineReadings.next(reading));
    this.socket.on('connect', () => this.connectionChanges.next(true));
    this.socket.on('disconnect', () => this.connectionChanges.next(false));
    this.socket.on('connect_error', () => this.connectionChanges.next(false));
  }

  connect(): void {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  isConnected(): boolean {
    return this.socket.connected;
  }
}
