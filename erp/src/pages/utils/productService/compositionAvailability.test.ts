import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Product from '../../types/product.type';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  in: vi.fn(),
  select: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from },
}));

vi.mock('./productSkuService', () => ({
  TABLE_NAME: 'products',
}));

import { applyCompositionAvailability } from './compositionAvailability';

describe('applyCompositionAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
  });

  it('computes assembly stock from simple and variation components', async () => {
    mocks.in.mockResolvedValue({
      data: [
        { id: 'comp-1', stock: 10, product_variations: [] },
        { id: 'comp-2', stock: 3, product_variations: [{ id: 'var-2', stock: 7 }] },
      ],
      error: null,
    });

    const composition: Product = {
      id: 'kit-1',
      name: 'Conjunto Teste',
      itemType: 'composition',
      stock: 99,
      unitPrice: 500,
      comboItems: [
        { productId: 'comp-1', quantity: 2 },
        { productId: 'comp-2', variationId: 'var-2', quantity: 3 },
      ],
    } as Product;

    const [result] = await applyCompositionAvailability([composition]);
    expect(result.stock).toBe(2);
  });

  it('logs warning and zeros composition stock when lookup fails', async () => {
    mocks.in.mockRejectedValue(new Error('network timeout'));

    const composition: Product = {
      id: 'kit-1',
      name: 'Conjunto Teste',
      itemType: 'composition',
      stock: 15,
      unitPrice: 500,
      comboItems: [{ productId: 'comp-1', quantity: 1 }],
      variations: [{ id: 'v1', name: 'Padrao', stock: 15, unitPrice: 500, attributes: [] }],
    } as unknown as Product;

    const [result] = await applyCompositionAvailability([composition]);
    expect(result.stock).toBe(0);
    expect(result.variations?.[0].stock).toBe(0);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
