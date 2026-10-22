import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Order from '@/pages/types/order.type';
import { enrichAssistanceLinkedOrders } from '../assistanceLinkedOrderEnricher';
import { supabase } from '@/pages/utils/supabaseConfig';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('assistanceLinkedOrderEnricher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('não executa query se não houver pedidos de assistência vinculados', async () => {
    const orders: Order[] = [
      { id: '1', orderType: 'sale' } as Order,
      { id: '2', orderType: 'assistance' } as Order, // sem linkedOrderId
    ];

    await enrichAssistanceLinkedOrders(orders);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('enriquece pedidos de assistência vinculados com código e método de entrega', async () => {
    const orders: Order[] = [
      {
        id: 'ast-1',
        orderType: 'assistance',
        linkedOrderId: 'sale-100',
        shipping: { deliveryMethod: 'delivery' },
      } as unknown as Order,
      {
        id: 'ast-2',
        orderType: 'assistance',
        linkedOrderId: 'sale-200',
        shipping: { deliveryMethod: 'delivery' },
      } as unknown as Order,
    ];

    const mockSelect = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'sale-100',
            order_number: '100',
            order_index: 100,
            delivery_method: 'pickup',
          },
          {
            id: 'sale-200',
            order_number: '200',
            order_index: 200,
            delivery_method: 'delivery',
          },
        ],
        error: null,
      }),
    });

    (supabase.from as any).mockReturnValue({
      select: mockSelect,
    });

    await enrichAssistanceLinkedOrders(orders);

    expect(orders[0].linkedOrderCode).toBe('100');
    expect(orders[0].linkedOrderDeliveryMethod).toBe('pickup');
    expect(orders[0].shipping?.deliveryMethod).toBe('pickup');

    expect(orders[1].linkedOrderCode).toBe('200');
    expect(orders[1].linkedOrderDeliveryMethod).toBe('delivery');
    expect(orders[1].shipping?.deliveryMethod).toBe('delivery');
  });
});
