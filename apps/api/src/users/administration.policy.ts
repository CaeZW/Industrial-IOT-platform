export function canRemoveAdministrator(isActive: boolean, isAdministrator: boolean, activeAdministrators: number): boolean {
  return !isActive || !isAdministrator || activeAdministrators > 1;
}
