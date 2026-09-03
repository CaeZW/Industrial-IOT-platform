import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface ReadinessResponse {
  readonly checks: {
    readonly mqtt: 'up' | 'down';
    readonly postgres: 'up' | 'down';
  };
  readonly status: 'ok';
}

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly http = inject(HttpClient);

  readiness(): Observable<ReadinessResponse> {
    return this.http.get<ReadinessResponse>('/api/health/ready');
  }
}
