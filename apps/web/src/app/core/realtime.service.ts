import { Injectable } from '@angular/core';
import { io, type Socket } from 'socket.io-client';

@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly socket: Socket = io('/realtime', {
    autoConnect: false,
    transports: ['websocket'],
  });

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
