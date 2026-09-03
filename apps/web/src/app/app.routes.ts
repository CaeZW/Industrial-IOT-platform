import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
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
        title: 'Catálogo · Industrial IoT Platform',
        loadComponent: () =>
          import('./features/catalog/catalog-overview.component').then(
            ({ CatalogOverviewComponent }) => CatalogOverviewComponent,
          ),
      },
      {
        path: 'areas',
        title: 'Áreas · Industrial IoT Platform',
        loadComponent: () =>
          import('./features/catalog/areas-page.component').then(
            ({ AreasPageComponent }) => AreasPageComponent,
          ),
      },
      {
        path: 'machines',
        title: 'Máquinas · Industrial IoT Platform',
        data: { kind: 'machine' },
        loadComponent: () =>
          import('./features/catalog/equipment-page.component').then(
            ({ EquipmentPageComponent }) => EquipmentPageComponent,
          ),
      },
      {
        path: 'devices',
        title: 'Dispositivos · Industrial IoT Platform',
        data: { kind: 'device' },
        loadComponent: () =>
          import('./features/catalog/equipment-page.component').then(
            ({ EquipmentPageComponent }) => EquipmentPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
