import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { AdminOptions, AdminUser, EquipmentSetting, TemporaryPassword } from '@industrial-iot-platform/contracts';

export function administrationError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const message: unknown = (error.error as { message?: unknown } | null)?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.every((m) => typeof m === 'string')) return message.join(' · ');
  }
  return 'No se pudo completar la operación. Comprueba la conexión y vuelve a intentarlo.';
}
@Injectable({ providedIn: 'root' })
export class AdministrationApi {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/administration';
  users() { return firstValueFrom(this.http.get<AdminUser[]>(this.base + '/users')); }
  options(kind: 'user' | 'role') { return firstValueFrom(this.http.get<AdminOptions>(this.base + '/' + kind + '-options')); }
  create(input: { username: string; name: string; email: string | null; role: string; scopes: string[] }) {
    return firstValueFrom(this.http.post<TemporaryPassword>(this.base + '/users', input));
  }
  active(username: string, active: boolean) {
    return firstValueFrom(this.http.patch(this.base + '/users/' + encodeURIComponent(username) + '/active', { active }));
  }
  access(username: string, role: string, scopes: string[]) {
    return firstValueFrom(this.http.patch(this.base + '/users/' + encodeURIComponent(username) + '/access', { role, scopes }));
  }
  reset(username: string) {
    return firstValueFrom(this.http.post<TemporaryPassword>(this.base + '/users/' + encodeURIComponent(username) + '/reset-password', {}));
  }
  permissions(role: string, permissions: string[]) {
    return firstValueFrom(this.http.patch(this.base + '/roles/' + encodeURIComponent(role) + '/permissions', { permissions }));
  }
  equipment() { return firstValueFrom(this.http.get<EquipmentSetting[]>(this.base + '/equipment')); }
  saveEquipment(equipment: EquipmentSetting, persistenceIntervalSeconds: number, runningKey: string) {
    const body = equipment.kind === 'machine' ? { persistenceIntervalSeconds, runningKey } : { persistenceIntervalSeconds };
    return firstValueFrom(this.http.patch(this.base + '/equipment/' + (equipment.kind === 'machine' ? 'machines/' : 'devices/') + equipment.id, body));
  }
}
