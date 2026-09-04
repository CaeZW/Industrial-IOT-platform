import type { ResourceScope } from '@industrial-iot-platform/contracts';

export interface CatalogAccess {
  readonly scopes: readonly ResourceScope[];
  readonly permissions: readonly string[];
}
