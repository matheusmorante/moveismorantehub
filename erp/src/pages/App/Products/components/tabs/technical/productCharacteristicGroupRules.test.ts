import { describe, expect, it } from 'vitest';
import type { TechnicalFieldDefinition } from '@/pages/utils/technicalValuesService';
import {
  hasSavedCharacteristicGroupValues,
  resolveProductCharacteristicApplication,
  getSavedCharacteristicIds,
} from './productCharacteristicGroupRules';

const field: TechnicalFieldDefinition = {
  id: 'door-count', name: 'Quantidade de portas', groupId: 'doors', dataType: 'integer',
  options: [], categoryIds: ['wardrobe', 'rack'], requiredProductCategoryIds: ['wardrobe'],
  categoryApplications: [
    { categoryId: 'wardrobe', application: 'required' },
    { categoryId: 'rack', application: 'optional' },
    { categoryId: 'table', application: 'unavailable' },
  ],
};

describe('product characteristic group rules', () => {
  it('resolve a aplicação por característica e categoria, sem agregar pelo grupo', () => {
    expect(resolveProductCharacteristicApplication(field, ['wardrobe'])).toBe('required');
    expect(resolveProductCharacteristicApplication(field, ['rack'])).toBe('optional');
    expect(resolveProductCharacteristicApplication(field, ['table'])).toBe('unavailable');
    expect(resolveProductCharacteristicApplication(field, [])).toBe('unavailable');
  });

  it('detecta valores salvos no grupo em produto e variação', () => {
    const groupedFields = [{ id: 'quantity', name: 'Quantidade de portas', groupId: 'doors' }];
    expect(hasSavedCharacteristicGroupValues('doors', groupedFields, { technicalValues: { 'Quantidade de portas': '' } })).toBe(true);
    expect(hasSavedCharacteristicGroupValues('doors', groupedFields, { variations: [{ technicalValues: { 'Quantidade de portas': 2 } }] })).toBe(true);
    expect(hasSavedCharacteristicGroupValues('doors', groupedFields, { technicalValues: { Cor: 'Azul' } })).toBe(false);
  });

  it('não infere ativação a partir do marcador Não informar', () => {
    const saved = getSavedCharacteristicIds(
      [{ id: 'door-count', name: 'Quantidade de portas' }],
      { technicalValues: { 'Quantidade de portas': 'Não informar' } }
    );
    expect(saved).toEqual([]);
  });
});
