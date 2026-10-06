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

import {
  checkMobileProductVariationHasMoves,
  saveMobileProduct,
} from './mobileProductMutationService';

let query: any;

describe('saveMobileProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      neq: vi.fn(() => query),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);
    mocks.rpc.mockResolvedValue({ data: 'saved-product-id', error: null });
  });

  it('envia os campos suportados em uma RPC, converte preço local e deixa o estoque sob controle do inventário', async () => {
    const savedId = await saveMobileProduct({
      clientProductId: '123e4567-e89b-42d3-a456-426614174000',
      operationId: '123e4567-e89b-42d3-a456-426614174001',
      code: 'PROD',
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
      attributes: [{ name: 'Cor', value: 'Azul' }],
      technical_specs: { technicalValues: { Altura: '180' } },
      technicalValues: { Cor: 'Verde' },
      variations: [
        {
          id: 'new_PROD-01',
          name: 'Produto de teste',
          sku: 'PROD-01',
          attributes: [
            { name: 'Cor', value: 'Azul', showName: false },
            { name: 'Tamanho', value: 'M' },
          ],
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
    expect(query.in).toHaveBeenCalledWith('sku', ['PROD-01']);
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
        technical_specs: {
          technicalValues: { Altura: '180', Cor: 'Verde' },
        },
      },
    });
    expect(parameters.p_product).not.toHaveProperty('weight');
    expect(parameters.p_variations[0]).not.toHaveProperty('stock');
    expect(parameters.p_variations[0].combo_items).toEqual([]);
    expect(parameters.p_variations[0].name).toBe('Produto de teste M');
  });

  it('bloqueia a remoção local quando uma variação já aparece no histórico de vendas', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'order-item-id' }], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('inventory_moves');
    expect(mocks.from).toHaveBeenCalledWith('order_items');
  });
});
