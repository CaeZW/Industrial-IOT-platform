import type { ResourceScope, ResourceScopeType } from './auth.js';

export interface AdminUser {
  readonly username: string;
  readonly name: string;
  readonly email: string | null;
  readonly role: string;
  readonly isActive: boolean;
  readonly mustChangePassword: boolean;
  readonly scopes: readonly ResourceScope[];
}
export interface AdminRole {
  readonly code: string;
  readonly name: string;
  readonly permissions: readonly string[];
}
export interface ScopeOption {
  readonly type: ResourceScopeType;
  readonly resourceId: string;
  readonly value: string;
  readonly label: string;
}
export interface AdminOptions {
  readonly roles: readonly AdminRole[];
  readonly permissions: readonly string[];
  readonly scopes: readonly ScopeOption[];
}
export interface EquipmentSetting {
  readonly id: string;
  readonly kind: 'machine' | 'device';
  readonly code: string | null;
  readonly name: string;
  readonly area: string;
  readonly persistenceIntervalSeconds: number;
  readonly runningKey: string | null;
}
export interface TemporaryPassword {
  readonly username: string;
  readonly password: string;
}
