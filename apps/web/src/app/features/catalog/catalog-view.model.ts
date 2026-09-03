import type { EquipmentKind, PageMetadata } from '@industrial-iot-platform/contracts';

export function equipmentPlural(kind: EquipmentKind): string {
  return kind === 'machine' ? 'Máquinas' : 'Dispositivos';
}

export function pageRangeLabel(meta: PageMetadata): string {
  if (meta.totalItems === 0) {
    return 'Sin resultados';
  }

  const first = (meta.page - 1) * meta.pageSize + 1;
  const last = Math.min(meta.page * meta.pageSize, meta.totalItems);

  return `${first}–${last} de ${meta.totalItems}`;
}
