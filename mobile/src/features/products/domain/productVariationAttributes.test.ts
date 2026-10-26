import { describe, expect, it } from 'vitest';
import { parseProductVariationAttributes } from '../../../../../shared-utils/productVariationAttributes';

describe('parseProductVariationAttributes', () => {
  it('normalizes legacy aliases and excludes empty values', () => {
    expect(
      parseProductVariationAttributes([
        { attribute_name: 'Portas', option: '6', showName: false },
        { attribute: 'Material', val: 'MDF' },
        { key: 'Sem valor', value: '' },
      ])
    ).toEqual([
      { name: 'Portas', value: '6', showName: false },
      { name: 'Material', value: 'MDF', showName: true },
    ]);
  });

  it('uses the ERP fallback for nested values and preserves the mobile showName preference', () => {
    const raw = { Acabamento: { name: 'alto brilho', showName: false } };

    expect(parseProductVariationAttributes(raw)).toEqual([
      { name: 'Acabamento', value: 'alto brilho', showName: true },
    ]);
    expect(parseProductVariationAttributes(raw, { preserveStructuredShowName: true })).toEqual([
      { name: 'Acabamento', value: 'alto brilho', showName: false },
    ]);
  });
});
