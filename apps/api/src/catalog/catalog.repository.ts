import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  PageResult,
} from '@industrial-iot-platform/contracts';
import type { CatalogAccess } from './catalog-access.js';

export interface CatalogQuery {
  readonly areaId?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
}

export abstract class CatalogRepository {
  abstract getOverview(access: CatalogAccess): Promise<CatalogOverview>;
  abstract listAreas(query: CatalogQuery, access: CatalogAccess): Promise<PageResult<CatalogArea>>;
  abstract listDevices(
    query: CatalogQuery,
    access: CatalogAccess,
  ): Promise<PageResult<CatalogEquipment>>;
  abstract listMachines(
    query: CatalogQuery,
    access: CatalogAccess,
  ): Promise<PageResult<CatalogEquipment>>;
}
