import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  triggerMetaCatalogSync: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock('./mobileProductMetaCatalogSyncService', () => ({
  triggerMobileProductMetaCatalogSync: mocks.triggerMetaCatalogSync,
}));

import { checkMobileProductVariationHasMoves } from './mobileProductMutationService';

let query: any;

describe('checkMobileProductVariationHasMoves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      filter: vi.fn(() => query),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    mocks.from.mockReturnValue(query);
  });

  it('bloqueia a remoção local quando uma variação já aparece no histórico de vendas', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'order-item-id' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('inventory_moves');
    expect(mocks.from).toHaveBeenCalledWith('order_items');
  });

  it('bloqueia a remoção quando a variação aparece em recebimento de mercadoria', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'receipt-item-id' }], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(mocks.from).toHaveBeenCalledWith('goods_receipt_items');
  });

  it('bloqueia a remoção quando a variação aparece em nota de entrada', async () => {
    query.limit
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'inbound-invoice-id' }], error: null });

    await expect(
      checkMobileProductVariationHasMoves(
        '123e4567-e89b-42d3-a456-426614174000',
        '123e4567-e89b-42d3-a456-426614174002'
      )
    ).resolves.toBe(true);
    expect(query.filter).toHaveBeenCalledWith(
      'items',
      'cs',
      '[{"variationId": "123e4567-e89b-42d3-a456-426614174002"}]'
    );
    expect(mocks.from).toHaveBeenCalledWith('inbound_invoices');
  });

  it('falha fechado quando o id da variação não é UUID', async () => {
    await expect(checkMobileProductVariationHasMoves('produto', 'nova-variacao')).resolves.toBe(true);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
