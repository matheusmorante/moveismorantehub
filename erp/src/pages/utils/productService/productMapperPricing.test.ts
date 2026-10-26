import { describe, expect, it } from 'vitest';
import { LIGHT_COLUMNS } from './productQueryService';
import { mapFromDB } from './productMapper';

const productRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Mesa Aurora',
  code: 'MESA-1',
  item_type: 'product',
  is_draft: false,
  active: true,
  product_variations: [],
  ...overrides,
});

describe('product list parent unit price mapping', () => {
  it('selects the legacy alias so ERP lists can fall back when unit_price is null', () => {
    expect(LIGHT_COLUMNS.split(',').map((column) => column.trim())).toContain('price');
  });

  it('uses unit_price before a conflicting legacy price for product and default variation', () => {
    const mapped = mapFromDB(productRow({ unit_price: 120, price: 145 }));

    expect(mapped.unitPrice).toBe(120);
    expect(mapped.variations?.[0].unitPrice).toBe(120);
  });

  it('falls back to the legacy price for product and inherited variation when unit_price is null', () => {
    const mapped = mapFromDB(
      productRow({
        unit_price: null,
        price: 145,
        product_variations: [
          {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            product_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            sku: 'MESA-1-01',
            name: 'Mesa Aurora',
            price: 130,
            use_parent_price: null,
            active: true,
          },
        ],
      })
    );

    expect(mapped.unitPrice).toBe(145);
    expect(mapped.variations?.[0].unitPrice).toBe(145);
  });
});
