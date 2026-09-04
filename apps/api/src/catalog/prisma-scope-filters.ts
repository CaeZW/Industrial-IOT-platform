import type { Prisma } from '../generated/prisma/client.js';
import type { CatalogAccess } from './catalog-access.js';

export function scopeFilters(access: CatalogAccess) {
  const ids = (type: string) => access.scopes.filter((scope) => scope.type === type).map((scope) => scope.resourceId);
  const broadArea: Prisma.AreaWhereInput = { OR: [
    { id: { in: ids('AREA') } }, { plantId: { in: ids('PLANT') } },
  ] };
  const machine: Prisma.MachineWhereInput = access.permissions.includes('page.machines.view') ? {
    OR: [{ area: broadArea }, { id: { in: ids('MACHINE') } }],
  } : { id: { in: [] } };
  const device: Prisma.DeviceWhereInput = access.permissions.includes('page.devices.view') ? {
    OR: [{ area: broadArea }, { id: { in: ids('DEVICE') } }],
  } : { id: { in: [] } };
  const area: Prisma.AreaWhereInput = { OR: [
    broadArea, { machines: { some: machine } }, { devices: { some: device } },
  ] };
  const plant: Prisma.PlantWhereInput = { OR: [
    { id: { in: ids('PLANT') } }, { areas: { some: area } },
  ] };
  const count = { machines: { where: machine }, devices: { where: device } };
  return { machine, device, area, plant, count };
}
