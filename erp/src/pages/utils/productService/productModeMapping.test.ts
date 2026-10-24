import { describe, expect, it } from 'vitest';
import { mapFromDB } from './productMapper';
import { mapToDB } from './productToDbMapper';

const makeDbVariation = (id: string, name: string) => ({
  id,
  product_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sku: `SKU-${id}`,
  name,
  stock: 2,
  price: 100,
  attributes: [],
  image_url: 'https://img.test/item.jpg',
  active: true,
});

describe('product variation mode mapping', () => {
  it('maps an existing single variation as a simple product', () => {
    const product = mapFromDB({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Poltrona',
      item_type: 'product',
      is_draft: false,
      has_variations: true,
      product_variations: [makeDbVariation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Poltrona')],
    });

    expect(product.variations).toHaveLength(1);
    expect(product.hasVariations).toBe(false);
  });

  it('maps multiple variations as a product with variations and persists the mode by count', () => {
    const variations = [
      makeDbVariation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Poltrona Azul'),
      makeDbVariation('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Poltrona Verde'),
    ];
    const product = mapFromDB({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Poltrona',
      item_type: 'product',
      is_draft: false,
      has_variations: false,
      product_variations: variations,
    });

    expect(product.hasVariations).toBe(true);
    expect(mapToDB({ isDraft: false, hasVariations: false, variations: product.variations }).has_variations).toBe(true);
    expect(mapToDB({ isDraft: false, hasVariations: true, variations: (product.variations || []).slice(0, 1) }).has_variations).toBe(false);
  });

  it('infers variable characteristics from legacy variation overrides without rewriting their values', () => {
    const product = mapFromDB({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Poltrona',
      item_type: 'product',
      is_draft: false,
      product_variations: [
        {
          ...makeDbVariation('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Poltrona Azul'),
          attributes: [{ name: 'Cor', value: 'Azul' }],
        },
      ],
      technical_specs: {
        variationDetails: [
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            technicalValues: { 'Material da estrutura': 'MDF' },
          },
        ],
      },
    });

    expect(product.variableTechnicalFields).toEqual(['Cor', 'Material da estrutura']);
    expect(product.variations?.[0].attributes).toEqual([{ name: 'Cor', value: 'Azul', showName: true }]);
    expect(product.variations?.[0].technicalValues).toEqual({ 'Material da estrutura': 'MDF' });
  });

  it('persists the selected variable characteristics in existing technical_specs JSON', () => {
    const mapped = mapToDB({
      isDraft: false,
      technicalValues: { Marca: 'Morante' },
      variableTechnicalFields: ['Cor'],
    });

    expect(mapped.technical_specs).toMatchObject({
      technicalValues: { Marca: 'Morante' },
      variableTechnicalFields: ['Cor'],
    });
  });

  it('round-trips an explicitly empty variable override through technical_specs', () => {
    const variationId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const product = mapToDB({
      isDraft: false,
      variableTechnicalFields: ['Cor'],
      variations: [{ id: variationId, attributes: [], technicalValues: { Cor: '' } }],
    });

    expect(product.technical_specs.variationDetails).toEqual([
      expect.objectContaining({ id: variationId, technicalValues: { Cor: '' } }),
    ]);

    const hydrated = mapFromDB({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      name: 'Poltrona',
      item_type: 'product',
      is_draft: false,
      product_variations: [makeDbVariation(variationId, 'Poltrona')],
      technical_specs: product.technical_specs,
    });

    expect(hydrated.variations?.[0].technicalValues).toEqual({ Cor: '' });
    expect(hydrated.variations?.[0].attributes).toEqual([]);
  });
});
