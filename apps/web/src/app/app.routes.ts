import type { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'machines/:id', title: 'Máquina · Parámetros y horas', canActivate: [authGuard], data: { permission: 'page.machines.view' },
    loadComponent: () => import('./features/machines/machine-data.component').then((m) => m.MachineDataComponent) },
  { path: 'devices/:id', title: 'Lecturas del device', canActivate: [authGuard], data: { permission: 'page.devices.view' },
    loadComponent: () => import('./features/devices/device-data.component').then((m) => m.DeviceDataComponent) },
  { path: 'administration/users', title: 'Usuarios · Administración', canActivate: [authGuard],
    data: { permission: 'user.manage', administrator: true }, loadComponent: () => import('./features/administration/users-admin.component').then((m) => m.UsersAdminComponent) },
  { path: 'administration/roles', title: 'Roles · Administración', canActivate: [authGuard],
    data: { permission: 'role.manage', administrator: true }, loadComponent: () => import('./features/administration/roles-admin.component').then((m) => m.RolesAdminComponent) },
  { path: 'administration/equipment', title: 'Equipos · Administración', canActivate: [authGuard],
    data: { permission: 'configuration.write' }, loadComponent: () => import('./features/administration/equipment-settings.component').then((m) => m.EquipmentSettingsComponent) },
  { path: 'login', title: 'Acceso · Industrial IoT', loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent) },
  { path: 'change-password', title: 'Contraseña · Industrial IoT', canActivate: [authGuard], loadComponent: () => import('./features/auth/change-password.component').then((m) => m.ChangePasswordComponent) },
  { path: 'forbidden', title: 'Acceso restringido', canActivate: [authGuard], loadComponent: () => import('./features/auth/forbidden.component').then((m) => m.ForbiddenComponent) },
  {
    path: '',
    canActivate: [authGuard],
    title: 'Inicio · Industrial IoT Platform',
    loadComponent: () =>
      import('./features/home/home.component').then(
        ({ HomeComponent }) => HomeComponent,
      ),
  },
  {
    path: 'catalog',
    children: [
      {
        path: '',
        canActivate: [authGuard],
        data: { permission: 'page.dashboard.view' },
        title: 'Catálogo · Industrial IoT Platform',
        loadComponent: () =>
          import('./features/catalog/catalog-overview.component').then(
            ({ CatalogOverviewComponent }) => CatalogOverviewComponent,
          ),
      },
      {
        path: 'areas',
        canActivate: [authGuard],
        data: { permission: 'page.dashboard.view' },
        title: 'Áreas · Industrial IoT Platform',
        loadComponent: () =>
          import('./features/catalog/areas-page.component').then(
            ({ AreasPageComponent }) => AreasPageComponent,
          ),
      },
      {
        path: 'machines',
        canActivate: [authGuard],
        title: 'Máquinas · Industrial IoT Platform',
        data: { kind: 'machine', permission: 'page.machines.view' },
        loadComponent: () =>
          import('./features/catalog/equipment-page.component').then(
            ({ EquipmentPageComponent }) => EquipmentPageComponent,
          ),
      },
      {
        path: 'devices',
        canActivate: [authGuard],
        title: 'Dispositivos · Industrial IoT Platform',
        data: { kind: 'device', permission: 'page.devices.view' },
        loadComponent: () =>
          import('./features/catalog/equipment-page.component').then(
            ({ EquipmentPageComponent }) => EquipmentPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
