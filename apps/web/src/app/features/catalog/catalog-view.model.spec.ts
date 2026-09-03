import { describe, expect, it } from 'vitest';

import { equipmentPlural, pageRangeLabel } from './catalog-view.model';

describe('catalog presentation helpers', () => {
  it('labels both approved equipment kinds', () => {
    expect(equipmentPlural('machine')).toBe('Máquinas');
    expect(equipmentPlural('device')).toBe('Dispositivos');
  });

  it('describes empty and bounded page ranges', () => {
    expect(
      pageRangeLabel({ page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }),
    ).toBe('Sin resultados');
    expect(
      pageRangeLabel({ page: 3, pageSize: 20, totalItems: 45, totalPages: 3 }),
    ).toBe('41–45 de 45');
  });
});
