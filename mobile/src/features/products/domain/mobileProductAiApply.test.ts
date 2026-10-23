import { describe, expect, it } from 'vitest';
import type { ProductAiSuggestedCharacteristics } from '../../../../../shared-utils/productAiFormSchemas';
import { applyMobileAiCharacteristicsToProduct, buildMobileAiSuggestionRows } from './mobileProductAiApply';

const result: ProductAiSuggestedCharacteristics = {
  identifiedProduct: { name: 'Mesa Oslo', brand: 'Morante', model: 'Oslo', confidence: 'alta' },
  technicalValues: { Material: 'MDF', Acabamento: ['Fosco', 'Brilhante'] },
  itemConfidence: { Material: 'alta' },
  height: 75,
  width: 120,
  reasoning: 'Ficha do fabricante.',
};

describe('mobileProductAiApply', () => {
  it('aplica somente campos selecionados e sincroniza valores técnicos e dimensões', () => {
    const product = applyMobileAiCharacteristicsToProduct(
      { name: 'Nome atual', technicalValues: { Material: 'Madeira' }, attributes: [] },
      result,
      { __field_name__: true, __field_brand__: true, __field_height__: true, Material: false, Acabamento: true },
      { Acabamento: 'Fosco, Laminado' }
    );

    expect(product.name).toBe('Mesa Oslo');
    expect(product.title).toBe('Mesa Oslo');
    expect(product.brand).toBe('Morante');
    expect(product.height).toBe(75);
    expect(product.technicalValues).toMatchObject({ Material: 'Madeira', Marca: 'Morante', Altura: '75', Acabamento: ['Fosco', 'Laminado'] });
    expect(product.attributes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Marca', value: 'Morante' }),
      expect.objectContaining({ name: 'Altura', value: '75' }),
    ]));
  });

  it('inclui somente sugestões preenchidas e sinaliza campos que já têm valor', () => {
    const rows = buildMobileAiSuggestionRows(result, {
      name: 'Nome existente',
      technicalValues: { Material: 'MDF' },
    });

    expect(rows.find((row) => row.key === '__field_name__')?.isExisting).toBe(true);
    expect(rows.find((row) => row.key === 'Material')?.isExisting).toBe(true);
    expect(rows.find((row) => row.key === 'Acabamento')?.value).toBe('Fosco, Brilhante');
    expect(rows.some((row) => row.key === '__field_weight__')).toBe(false);
  });
});
