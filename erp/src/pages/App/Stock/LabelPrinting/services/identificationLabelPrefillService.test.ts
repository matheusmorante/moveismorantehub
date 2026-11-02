import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  prepareIdentificationLabelProducts,
  prepareIdentificationLabelProductsForReceipt,
} from './identificationLabelPrefillService';
const mocks = vi.hoisted(() => ({
  from: vi.fn(), select: vi.fn(), is: vi.fn(), in: vi.fn(),
  receiptSelect: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
const row = { id: 'product-1', name: 'Produto atual', code: '101', unit_price: 100, has_variations: false,
  variations: [{ id: 'variation-1', name: 'Variação atual', sku: '101-01', price: 110, stock: 3 }] };
const receiptId = '00000000-0000-4000-8000-000000000001';
const receipt = {
  id: receiptId,
  status: 'received',
  is_draft: false,
  goods_receipt_items: [{ item_index: 0, product_id: 'product-1', variation_id: 'variation-1', quantity: 2 }],
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation((table: string) => ({
    select: table === 'goods_receipts' ? mocks.receiptSelect : mocks.select,
  }));
  mocks.select.mockReturnValue({ is: mocks.is });
  mocks.is.mockReturnValue({ in: mocks.in }); mocks.in.mockResolvedValue({ data: [row], error: null });
  mocks.receiptSelect.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.maybeSingle.mockResolvedValue({ data: receipt, error: null });
});
afterEach(() => vi.useRealTimers());
describe('etiquetas a partir dos produtos vinculados da NF ou do recebimento', () => {
  it('carrega a variação única de produto simples e agrupa as unidades', async () => {
    const result = await prepareIdentificationLabelProducts([
      { productId: 'product-1', variationId: 'variation-1', quantity: 2 },
      { productId: 'product-1', variationId: 'variation-1', quantity: 1 },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'variation-1', parentId: 'product-1', variationId: 'variation-1', description: 'Variação atual', sku: '101-01', labelQty: 3 });
  });
  it('mantém a referência ao produto quando não há variação informada', async () => {
    const result = await prepareIdentificationLabelProducts([{ productId: 'product-1', quantity: 2 }]);
    expect(result[0]).toMatchObject({ id: 'product-1', description: 'Produto atual', labelQty: 2 });
  });
  it('não troca variação ausente por outra do produto', async () => {
    await expect(prepareIdentificationLabelProducts([{ productId: 'product-1', variationId: 'missing', quantity: 1 }])).rejects.toThrow('não está mais disponível');
  });
  it.each([0, -1, 0.5, NaN])('quantidade %s não inicia consulta', async (quantity) => {
    await expect(prepareIdentificationLabelProducts([{ productId: 'product-1', quantity }])).rejects.toThrow('quantidade inteira');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('timeout da leitura libera a operação com erro explícito', async () => {
    vi.useFakeTimers(); mocks.in.mockReturnValue(new Promise(() => {}));
    const result = prepareIdentificationLabelProducts([{ productId: 'product-1', quantity: 1 }]);
    const assertion = expect(result).rejects.toThrow('excedeu o prazo');
    await vi.advanceTimersByTimeAsync(10001); await assertion;
  });

  it('carrega os produtos vinculados de um recebimento concluído sem pedir sku inexistente em products', async () => {
    const result = await prepareIdentificationLabelProductsForReceipt(receiptId);
    const productColumns = String(mocks.select.mock.calls[0]?.[0] || '');

    expect(mocks.from).toHaveBeenNthCalledWith(1, 'goods_receipts');
    expect(mocks.eq).toHaveBeenCalledWith('id', receiptId);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'variation-1', parentId: 'product-1', variationId: 'variation-1', labelQty: 2,
    });
    expect(productColumns.split('variations:product_variations')[0]).not.toContain('sku');
    expect(productColumns).toContain('variations:product_variations');
  });

  it('não carrega produtos de recebimento que não esteja recebido', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: { ...receipt, status: 'draft' },
      error: null,
    });

    await expect(prepareIdentificationLabelProductsForReceipt(receiptId))
      .rejects.toThrow('somente para recebimentos concluídos');
    expect(mocks.from).toHaveBeenCalledTimes(1);
    expect(mocks.from).toHaveBeenCalledWith('goods_receipts');
  });
});
