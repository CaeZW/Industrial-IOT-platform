import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  CatalogArea,
  CatalogEquipment,
  CatalogOverview,
  EquipmentKind,
  PageResult,
} from '@industrial-iot-platform/contracts';
import type { Observable } from 'rxjs';

export interface CatalogListQuery {
  readonly areaId?: string;
  readonly page: number;
  readonly pageSize: number;
  readonly search?: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  overview(): Observable<CatalogOverview> {
    return this.http.get<CatalogOverview>('/api/catalog/overview');
  }

  areas(query: CatalogListQuery): Observable<PageResult<CatalogArea>> {
    return this.http.get<PageResult<CatalogArea>>('/api/catalog/areas', {
      params: this.params(query),
    });
  }

  equipment(
    kind: EquipmentKind,
    query: CatalogListQuery,
  ): Observable<PageResult<CatalogEquipment>> {
    const endpoint = kind === 'machine' ? 'machines' : 'devices';

    return this.http.get<PageResult<CatalogEquipment>>(
      `/api/catalog/${endpoint}`,
      { params: this.params(query) },
    );
  }

  private params(query: CatalogListQuery): HttpParams {
    let params = new HttpParams()
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.search !== undefined && query.search.length > 0) {
      params = params.set('search', query.search);
    }

    if (query.areaId !== undefined && query.areaId.length > 0) {
      params = params.set('areaId', query.areaId);
    }

    return params;
  }
}
