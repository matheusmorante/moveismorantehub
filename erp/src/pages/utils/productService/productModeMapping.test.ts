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
});
