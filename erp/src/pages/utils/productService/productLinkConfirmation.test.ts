import { describe, expect, it, vi } from 'vitest';

const { select, eq, maybeSingle } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  return { select, eq, maybeSingle };
});

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: () => ({ select }) },
}));

import { getProductLinkConfirmation } from './queries/productQueryService';

const productRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  deleted: false,
  code: '000123',
  name: 'Roupeiro América',
  marketplace_title: 'Roupeiro América 2 Portas',
  description: '',
  is_draft: false,
  status: 'hidden',
  item_type: 'product',
};

describe('getProductLinkConfirmation', () => {
  it('confirms a product using the columns available on products', async () => {
    maybeSingle.mockResolvedValueOnce({ data: productRow, error: null });

    await expect(getProductLinkConfirmation(productRow.id)).resolves.toMatchObject({
      id: productRow.id,
      code: productRow.code,
      name: productRow.name,
      title: productRow.marketplace_title,
      deleted: false,
    });

    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(Object.keys(productRow).join(','));
    expect(eq).toHaveBeenCalledWith('id', productRow.id);
  });

  it('confirms the selected variation with its own name and SKU', async () => {
    const variation = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      product_id: productRow.id,
      sku: '000123-01',
      name: 'Roupeiro América Off White',
      use_parent_name: true,
    };
    const sibling = {
      ...variation,
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      sku: '000123-02',
      name: 'Roupeiro América Grafite',
    };
    maybeSingle.mockResolvedValueOnce({
      data: { ...productRow, product_variations: [variation, sibling] },
      error: null,
    });

    const result = await getProductLinkConfirmation(productRow.id, variation.id);

    expect(result?.variations).toEqual([
      { id: variation.id, name: variation.name, sku: variation.sku },
    ]);
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(
      `${Object.keys(productRow).join(',')},product_variations(id,product_id,sku,name,use_parent_name)`,
    );
  });
});
