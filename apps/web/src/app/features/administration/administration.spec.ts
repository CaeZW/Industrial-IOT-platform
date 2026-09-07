import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { AdministrationApi } from './administration-api.service';
import { UsersAdminComponent } from './users-admin.component';
import { RolesAdminComponent } from './roles-admin.component';
import { EquipmentSettingsComponent } from './equipment-settings.component';
import type { AdminOptions, AdminUser, EquipmentSetting } from '@industrial-iot-platform/contracts';

const options: AdminOptions = {
  roles: [
    { code: 'ADMINISTRATOR', name: 'Administrador', permissions: ['user.manage', 'role.manage'] },
    { code: 'OPERATOR', name: 'Operador', permissions: ['page.machines.view'] },
  ],
  permissions: ['user.manage', 'role.manage', 'page.machines.view'],
  scopes: [{ type: 'AREA', resourceId: 'area-1', value: 'AREA:ESTABILIDAD', label: 'Área · Estabilidad' }],
};
const user: AdminUser = { username: 'operator', name: 'Operador de prueba', email: null, role: 'OPERATOR',
  isActive: true, mustChangePassword: false, scopes: [{ type: 'AREA', resourceId: 'area-1' }] };
const machine: EquipmentSetting = { id: 'm1', kind: 'machine', code: 'MQ-1', name: 'Máquina de prueba', area: 'Estabilidad', persistenceIntervalSeconds: 300, runningKey: 'en_marcha' };
const device: EquipmentSetting = { id: 'd1', kind: 'device', code: 'D-1', name: 'Device de prueba', area: 'Estabilidad', persistenceIntervalSeconds: 300, runningKey: null };
function apiMock() {
  return { users: vi.fn().mockResolvedValue([user]), options: vi.fn().mockResolvedValue(options),
    create: vi.fn().mockResolvedValue({ username: 'new_user', password: 'temporary-test-only' }),
    access: vi.fn().mockResolvedValue(undefined), active: vi.fn().mockResolvedValue(undefined),
    reset: vi.fn().mockResolvedValue({ username: user.username, password: 'reset-test-only' }),
    permissions: vi.fn().mockResolvedValue(undefined), equipment: vi.fn().mockResolvedValue([machine, device]),
    saveEquipment: vi.fn().mockResolvedValue(undefined) };
}
async function loaded<T extends { loading(): boolean }>(fixture: ComponentFixture<T>) {
  await fixture.whenStable();
  await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
  fixture.detectChanges();
  await fixture.whenStable();
}
describe('administration forms', () => {
  let api: ReturnType<typeof apiMock>;
  beforeEach(() => {
    api = apiMock();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: AdministrationApi, useValue: api },
      { provide: AuthService, useValue: { session: signal({ user: { roles: ['ADMINISTRATOR'] } }), has: () => true } },
    ] });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });
  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });
  it('shows users, resolves scope selections and saves only the selected access', async () => {
    const fixture = TestBed.createComponent(UsersAdminComponent); await loaded(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Operador de prueba');
    fixture.componentInstance.edit(user);
    expect(fixture.componentInstance.scopes).toEqual(['AREA:ESTABILIDAD']);
    fixture.componentInstance.role = 'ADMINISTRATOR';
    await fixture.componentInstance.save();
    expect(api.access).toHaveBeenCalledWith('operator', 'ADMINISTRATOR', ['AREA:ESTABILIDAD']);
  });
  it('shows a newly generated password transiently and clears it on navigation', async () => {
    const fixture = TestBed.createComponent(UsersAdminComponent); await loaded(fixture);
    Object.assign(fixture.componentInstance, { username: 'new_user', name: 'New user', role: 'OPERATOR', scopes: [] });
    await fixture.componentInstance.save(); await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('temporary-test-only');
    fixture.destroy();
    expect(fixture.componentInstance.credential()).toBeNull();
  });
  it('cancelling a password reset makes no request', async () => {
    const fixture = TestBed.createComponent(UsersAdminComponent); await loaded(fixture);
    vi.mocked(window.confirm).mockReturnValue(false);
    await fixture.componentInstance.reset(user);
    expect(api.reset).not.toHaveBeenCalled();
  });
  it('does not allow editing the protected administrator permission set', async () => {
    const fixture = TestBed.createComponent(RolesAdminComponent); await loaded(fixture);
    fixture.componentInstance.selectRole('ADMINISTRATOR'); await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(true);
    await fixture.componentInstance.save(); expect(api.permissions).not.toHaveBeenCalled();
    fixture.componentInstance.selectRole('OPERATOR'); fixture.componentInstance.toggle('user.manage');
    await fixture.componentInstance.save();
    expect(api.permissions).toHaveBeenCalledWith('OPERATOR', ['page.machines.view', 'user.manage']);
  });
  it('converts minutes to seconds per equipment and hides the running key for devices', async () => {
    const fixture = TestBed.createComponent(EquipmentSettingsComponent); await loaded(fixture);
    fixture.componentInstance.select(machine); await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[name=runningKey]')).not.toBeNull();
    fixture.componentInstance.minutes = 2; fixture.componentInstance.runningKey = 'arranque';
    await fixture.componentInstance.save();
    expect(api.saveEquipment).toHaveBeenCalledWith(machine, 120, 'arranque');
    expect(fixture.componentInstance.equipment().find((e) => e.id === device.id)?.persistenceIntervalSeconds).toBe(300);
    fixture.componentInstance.select(device); await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('input[name=runningKey]')).toBeNull();
    fixture.componentInstance.minutes = 10; await fixture.componentInstance.save();
    expect(api.saveEquipment).toHaveBeenLastCalledWith(device, 600, '');
  });
  it('rejects zero intervals and blank machine keys without sending them', async () => {
    const fixture = TestBed.createComponent(EquipmentSettingsComponent); await loaded(fixture);
    fixture.componentInstance.select(machine); fixture.componentInstance.minutes = 0;
    await fixture.componentInstance.save(); expect(api.saveEquipment).not.toHaveBeenCalled();
    fixture.componentInstance.minutes = 5; fixture.componentInstance.runningKey = '  ';
    await fixture.componentInstance.save(); expect(api.saveEquipment).not.toHaveBeenCalled();
  });
});
