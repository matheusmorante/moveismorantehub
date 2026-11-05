// @vitest-environment happy-dom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), in: vi.fn(), subscribe: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/pages/utils/orderHistoryService', () => ({ subscribeToOrderChanges: mocks.subscribe }));
import { useInventoryOrdersLookup } from './useInventoryOrdersLookup';

describe('pedidos referenciados no histórico de estoque', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.subscribe.mockReturnValue(vi.fn());
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
    mocks.in.mockResolvedValue({ data: [{ id: 'sale-a', order_index: 3212, customer_name: 'ANA SILVA' }], error: null });
  });
  it('consulta apenas os IDs e códigos da página visível', async () => {
    const { result, unmount } = renderHook(() => useInventoryOrdersLookup(['sale-a', '003212']));
    await waitFor(() => expect(result.current.formatOrderLabel('sale-a')).toBe('Pedido de venda #003212 - Ana Silva'));
    expect(mocks.in).toHaveBeenCalledWith('id', ['003212', 'sale-a']);
    expect(mocks.in).toHaveBeenCalledWith('order_index', ['3212']);
    expect(result.current.formatReversalReason('Cancelamento da venda #003212')).toBe('Cancelamento da venda #003212 - Ana Silva');
    unmount();
  });
  it('não carrega uma lista global quando não há referências', () => {
    const { unmount } = renderHook(() => useInventoryOrdersLookup([]));
    expect(mocks.from).not.toHaveBeenCalled();
    unmount();
  });
});
