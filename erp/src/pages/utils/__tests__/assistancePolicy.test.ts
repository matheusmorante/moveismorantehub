import { describe, it, expect } from 'vitest';
import { canGenerateAssistance } from '../assistancePolicy';
import Order from '@/pages/types/order.type';

describe('canGenerateAssistance', () => {
  it('retorna false para pedidos nulos ou indefinidos', () => {
    expect(canGenerateAssistance(null)).toBe(false);
    expect(canGenerateAssistance(undefined)).toBe(false);
  });

  it('retorna false para pedidos que não são de venda ou showroom', () => {
    const budgetOrder = { orderType: 'budget', status: 'fulfilled' } as Order;
    const assistanceOrder = { orderType: 'assistance', status: 'fulfilled' } as Order;
    const returnOrder = { orderType: 'return', status: 'fulfilled' } as Order;

    expect(canGenerateAssistance(budgetOrder)).toBe(false);
    expect(canGenerateAssistance(assistanceOrder)).toBe(false);
    expect(canGenerateAssistance(returnOrder)).toBe(false);
  });

  it('retorna false para pedidos de venda que ainda não foram atendidos', () => {
    const draftOrder = { orderType: 'sale', status: 'draft' } as Order;
    const scheduledOrder = { orderType: 'sale', status: 'scheduled' } as Order;
    const cancelledOrder = { orderType: 'sale', status: 'cancelled' } as Order;

    expect(canGenerateAssistance(draftOrder)).toBe(false);
    expect(canGenerateAssistance(scheduledOrder)).toBe(false);
    expect(canGenerateAssistance(cancelledOrder)).toBe(false);
  });

  it('retorna true para pedidos de venda com status atendido (fulfilled, delivered, etc.)', () => {
    const fulfilledOrder = { orderType: 'sale', status: 'fulfilled' } as Order;
    const deliveredOrder = { orderType: 'sale', status: 'delivered' } as Order;
    const atendidoOrder = { orderType: 'sale', status: 'Atendido' } as Order;

    expect(canGenerateAssistance(fulfilledOrder)).toBe(true);
    expect(canGenerateAssistance(deliveredOrder)).toBe(true);
    expect(canGenerateAssistance(atendidoOrder)).toBe(true);
  });

  it('retorna true para pedidos com circulação de mercadoria concluída', () => {
    const deliveredShippingOrder = {
      orderType: 'sale',
      status: 'scheduled',
      shipping: { deliveryStatus: 'delivered' },
    } as unknown as Order;

    expect(canGenerateAssistance(deliveredShippingOrder)).toBe(true);
  });
});
