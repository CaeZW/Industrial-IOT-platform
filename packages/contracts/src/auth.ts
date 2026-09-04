export type ResourceScopeType = 'PLANT' | 'AREA' | 'MACHINE' | 'DEVICE';
export interface ResourceScope {
  readonly type: ResourceScopeType;
  readonly resourceId: string;
}
export interface AuthUser {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly mustChangePassword: boolean;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly scopes: readonly ResourceScope[];
}
export interface AuthSession {
  readonly passwordPolicy: { readonly minLength: number; readonly maxLength: number };
  readonly user: AuthUser;
  readonly expiresAt: string;
  readonly idleExpiresAt: string;
}
