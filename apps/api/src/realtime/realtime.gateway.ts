import { ForbiddenException, Logger } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { WebSocketGateway } from '@nestjs/websockets';
import type { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { AuthService } from '../auth/auth.service.js';
import { BrowserSecurityService } from '../auth/browser-security.service.js';
import { cookieToken } from '../auth/auth.http.js';
import type { DeviceReading, MachineReading } from '@industrial-iot-platform/contracts';
import { MachineDataRepository } from '../machine-data/machine-data.repository.js';
import type { SessionRecord } from '../auth/auth.types.js';
import { DeviceDataRepository } from '../device-data/device-data.repository.js';

@WebSocketGateway({ namespace: '/realtime', cors: false })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private namespace: Namespace | undefined;
  constructor(private readonly auth: AuthService, private readonly browser: BrowserSecurityService,
    private readonly devices: DeviceDataRepository, private readonly machines: MachineDataRepository) {}
  afterInit(namespace: Namespace): void {
    this.namespace = namespace;
    namespace.use((client, next) => {
      void this.authorize(client).then(() => next()).catch(() => next(new Error('UNAUTHORIZED')));
    });
  }
  private async authorize(client: Socket): Promise<SessionRecord> {
    const context = { correlationId: randomUUID(), sourceIp: client.handshake.address.slice(0, 64),
      userAgent: String(client.handshake.headers['user-agent'] ?? '').slice(0, 300) };
    try {
      if (!this.browser.allows(client.handshake.headers.origin)) throw new ForbiddenException();
      const session = await this.auth.authenticate(cookieToken(client.handshake.headers.cookie));
      if (session.user.mustChangePassword || !session.user.permissions.some((p) => ['page.dashboard.view', 'page.devices.view', 'page.machines.view'].includes(p))) throw new ForbiddenException();
      return session;
    } catch (error) {
      await this.auth.denied(context, 'WEBSOCKET_ACCESS_DENIED');
      throw error;
    }
  }
  async publishDevice(reading: DeviceReading): Promise<void> {
    if (!this.namespace) return;
    for (const client of this.namespace.sockets.values()) {
      try {
        const session = await this.authorize(client);
        if (await this.devices.detail(reading.deviceId, session.user)) client.emit('device.reading', reading);
      } catch { client.disconnect(true); }
    }
  }
  handleConnection(client: Socket): void {
    client.use((_packet, next) => {
      void this.authorize(client).then(() => next()).catch(() => {
        next(new Error('UNAUTHORIZED')); client.disconnect(true);
      });
    });
    const timer = setInterval(() => {
      void this.authorize(client).catch(() => client.disconnect(true));
    }, 15000);
    timer.unref();
    this.timers.set(client.id, timer);
    this.logger.debug('Authenticated realtime connection opened.');
  }
  async publishMachine(reading: MachineReading): Promise<void> {
    if (!this.namespace) return;
    for (const client of this.namespace.sockets.values()) {
      try {
        const session = await this.authorize(client);
        if (await this.machines.detail(reading.machineId, session.user)) client.emit('machine.reading', reading);
      } catch { client.disconnect(true); }
    }
  }
  handleDisconnect(client: Socket): void {
    clearInterval(this.timers.get(client.id));
    this.timers.delete(client.id);
  }
  onModuleDestroy(): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }
}
