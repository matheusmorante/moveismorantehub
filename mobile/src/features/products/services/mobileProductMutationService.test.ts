import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { saveMobileProduct } from './mobileProductMutationService';

describe('saveMobileProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const query: any = {
      select: vi.fn(() => query),
      neq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({ data: 'saved-product-id', error: null });
  });

  it('envia os campos suportados em uma RPC, converte preço local e deixa o estoque sob controle do inventário', async () => {
    const savedId = await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD-01',
      name: 'Produto de teste',
      itemType: 'product',
      productKind: 'normal',
      unitPrice: '1.234,50',
      promoPrice: '1.199,90',
      costPrice: '1.000,00',
      freightCost: '25,50',
      ipiPercent: '5,25',
      finalPurchasePrice: '1.078,00',
      minStock: '2,5',
      variations: [
        {
          id: 'new_PROD-01-01',
          name: 'Produto de teste',
          sku: 'PROD-01-01',
          attributes: { Cor: 'Azul' },
          syncUnitPrice: true,
          syncPromoPrice: true,
          comboItems: [],
          stock: 999,
        },
      ],
      images: [],
      categoryIds: [],
    });

    expect(savedId).toBe('saved-product-id');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith('product_variations');
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    const [rpcName, parameters] = mocks.rpc.mock.calls[0];
    expect(rpcName).toBe('save_mobile_product_transaction');
    expect(parameters).toMatchObject({
      p_is_edit: false,
      p_product_id: '123e4567-e89b-42d3-a456-426614174000',
      p_product: {
        unit_price: 1234.5,
        price: 1234.5,
        marketplace_title: 'Produto de teste',
        promo_price: 1199.9,
        cost_price: 1000,
        freight_cost: 25.5,
        ipi_percent: 5.25,
        final_purchase_price: 1078,
        min_stock: 2.5,
      },
    });
    expect(parameters.p_product).not.toHaveProperty('weight');
    expect(parameters.p_variations[0]).not.toHaveProperty('stock');
    expect(parameters.p_variations[0].combo_items).toEqual([]);
  });
});
