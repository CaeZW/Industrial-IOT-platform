import type { AdminOptions, EquipmentSetting } from '@industrial-iot-platform/contracts';
import type { AuditInput } from '../auth/auth.types.js';
import type { CatalogAccess } from '../catalog/catalog-access.js';

export abstract class AdministrationRepository {
  abstract options(): Promise<AdminOptions>;
  abstract settings(access: CatalogAccess): Promise<EquipmentSetting[]>;
  abstract updateSetting(kind: 'machine' | 'device', id: string, interval: number,
    runningKey: string | undefined, access: CatalogAccess, audit: AuditInput): Promise<void>;
}
