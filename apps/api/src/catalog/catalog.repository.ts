import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  PageResult,
} from '@industrial-iot-platform/contracts';

export interface CatalogQuery {
  readonly areaId?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
}

export abstract class CatalogRepository {
  abstract getOverview(): Promise<CatalogOverview>;
  abstract listAreas(query: CatalogQuery): Promise<PageResult<CatalogArea>>;
  abstract listDevices(
    query: CatalogQuery,
  ): Promise<PageResult<CatalogEquipment>>;
  abstract listMachines(
    query: CatalogQuery,
  ): Promise<PageResult<CatalogEquipment>>;
}
