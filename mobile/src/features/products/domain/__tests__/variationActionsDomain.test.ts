import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  getMobileVariationActionRequirements,
  mobileVariationAttributesConflict,
  toMobileVariationAttributes,
} from '../variationActionsDomain';

describe('variationActionsDomain', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('normalizes JSON string, array, and object variation attributes preserving showName', () => {
    expect(toMobileVariationAttributes('{"Cor":{"value":"Preto","showName":false}}')).toEqual([
      { name: 'Cor', value: 'Preto', showName: false },
    ]);
    expect(toMobileVariationAttributes([{ key: 'Tamanho', val: 'M' }])).toEqual([
      { name: 'Tamanho', value: 'M', showName: undefined },
    ]);
    expect(toMobileVariationAttributes('{invalid-json')).toEqual([]);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it('computes supplier and valid attribute action requirements', () => {
    expect(
      getMobileVariationActionRequirements(
        { supplier_id: 'supplier-1' },
        { attributes: '{"Cor":{"value":"Azul"}}' }
      )
    ).toEqual({ hasSupplier: true, hasValidAttributes: true });
    expect(
      getMobileVariationActionRequirements({}, { attributes: [{ name: 'Cor', value: '  ' }] })
    ).toEqual({ hasSupplier: false, hasValidAttributes: false });
  });

  it('detects equivalent attribute sets independent of order and casing', () => {
    expect(
      mobileVariationAttributesConflict(
        [
          { name: 'Cor', value: 'Freijó' },
          { name: 'Lado', value: 'Direito' },
        ],
        [
          { name: 'lado', value: 'direito' },
          { name: 'cor', value: 'Freijó' },
        ]
      )
    ).toBe(true);
  });
});
