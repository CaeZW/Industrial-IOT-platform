export interface PageMetadata {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface PageResult<T> {
  readonly items: readonly T[];
  readonly meta: PageMetadata;
}

export interface CatalogPlant {
  readonly areaCount: number;
  readonly code: string;
  readonly deviceCount: number;
  readonly id: string;
  readonly isActive: boolean;
  readonly machineCount: number;
  readonly name: string;
}

export interface CatalogArea {
  readonly code: string;
  readonly deviceCount: number;
  readonly id: string;
  readonly isActive: boolean;
  readonly machineCount: number;
  readonly name: string;
  readonly plant: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
}

export type EquipmentKind = 'device' | 'machine';

export interface CatalogEquipment {
  readonly area: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
  readonly code: string | null;
  readonly description: string | null;
  readonly id: string;
  readonly isActive: boolean;
  readonly kind: EquipmentKind;
  readonly legacyId: number | null;
  readonly name: string;
  readonly plant: {
    readonly code: string;
    readonly id: string;
    readonly name: string;
  };
  readonly type: string | null;
}

export interface CatalogOverview {
  readonly plants: readonly CatalogPlant[];
  readonly totals: {
    readonly areas: number;
    readonly devices: number;
    readonly machines: number;
    readonly plants: number;
  };
}
