import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prepareIdentificationLabelProducts } from './identificationLabelPrefillService';
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), is: vi.fn(), in: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
const row = { id: 'product-1', name: 'Produto atual', code: '101', unit_price: 100, has_variations: false,
  variations: [{ id: 'variation-1', name: 'Variação atual', sku: '101-01', price: 110, stock: 3 }] };
beforeEach(() => {
  vi.clearAllMocks(); mocks.from.mockReturnValue({ select: mocks.select }); mocks.select.mockReturnValue({ is: mocks.is });
  mocks.is.mockReturnValue({ in: mocks.in }); mocks.in.mockResolvedValue({ data: [row], error: null });
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
});
