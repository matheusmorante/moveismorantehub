import { describe, expect, it } from 'vitest';
import {
  generateMobileProductVariations,
  getInitialMobileVariationStatus,
} from './mobileProductVariationGeneration';

describe('generateMobileProductVariations', () => {
  it('gera o produto cartesiano com nomes, atributos, SKUs únicos e campos variáveis', () => {
    const result = generateMobileProductVariations(
      [
        { name: 'Cor', values: ['azul', 'verde'], showName: true },
        { name: 'Tamanho', values: ['P', 'M'], showName: false },
      ],
      { name: 'Camiseta', code: 'CAM', unitPrice: 80, costPrice: 35 },
      [{ sku: 'CAM-01' }, { sku: 'CAM-03' }]
    );

    expect(result.variations).toHaveLength(4);
    expect(result.variations.map(({ sku }) => sku)).toEqual([
      'CAM-02',
      'CAM-04',
      'CAM-05',
      'CAM-06',
    ]);
    expect(result.variations[0]).toMatchObject({
      name: 'Camiseta Azul P',
      unitPrice: 80,
      costPrice: 35,
      stock: 0,
      active: false,
      status: 'hidden',
      attributes: [
        { name: 'Cor', value: 'Azul', showName: true },
        { name: 'Tamanho', value: 'P', showName: false },
      ],
    });
    expect(new Set(result.variations.map(({ id }) => id)).size).toBe(4);
    expect(result.variableTechnicalFields).toEqual(['Cor', 'Tamanho']);
  });

  it('mantém as novas variações em rascunho e rejeita seleção incompleta', () => {
    const draft = generateMobileProductVariations(
      [{ name: 'Cor', values: ['preto'], showName: true }],
      { name: 'Mesa', isDraft: true }
    );
    const invalid = generateMobileProductVariations(
      [{ name: 'Cor', values: [], showName: true }],
      { name: 'Mesa' }
    );

    expect(draft.variations[0]).toMatchObject({ name: 'Mesa Preto', status: 'draft' });
    expect(invalid.variations).toEqual([]);
  });

  it('cria variações novas como ocultas em produtos concluídos e como rascunho em cadastros incompletos', () => {
    expect(getInitialMobileVariationStatus({ status: 'published' })).toBe('hidden');
    expect(getInitialMobileVariationStatus({ status: 'hidden' })).toBe('hidden');
    expect(getInitialMobileVariationStatus({ is_draft: true })).toBe('draft');
  });
});
