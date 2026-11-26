import { describe, expect, it } from 'vitest';
import type Order from '@/pages/types/order.type';
import { prepareOrderForFormEditing } from '../hooks/drafts/orderFormSnapshot';
import {
  getOperationsFreightTotal,
  getPrimaryOperationDistance,
  normalizeOperationFreight,
} from './operationFreight';

describe('frete por operação', () => {
  it('migra frete e distância legados para a primeira operação de entrega', () => {
    const appointments = normalizeOperationFreight([
      { id: 'pickup', deliveryMethod: 'pickup' as const },
      { id: 'delivery', deliveryMethod: 'delivery' as const },
    ], 'delivery', 42.5, 8.5);

    expect(appointments).toMatchObject([
      { id: 'pickup', freightValue: 0 },
      { id: 'delivery', freightValue: 42.5, distance: 8.5 },
    ]);
    expect(getOperationsFreightTotal(appointments, 'delivery')).toBe(42.5);
    expect(getPrimaryOperationDistance(appointments, 'delivery')).toBe(8.5);
  });

  it('não soma nem migra frete para operações de retirada', () => {
    const appointments = normalizeOperationFreight([
      { id: 'pickup', deliveryMethod: 'pickup' as const },
    ], 'pickup', 42.5, 8.5);

    expect(appointments).toMatchObject([{ id: 'pickup', freightValue: 0 }]);
    expect(getOperationsFreightTotal(appointments, 'pickup')).toBe(0);
    expect(getPrimaryOperationDistance(appointments, 'pickup')).toBeUndefined();
  });

  it('migra frete e modalidade legados do pedido para a operação ao hidratar edição', () => {
    const legacyOrder = {
      id: 'order-1',
      orderType: 'sale',
      orderIndex: 1,
      items: [],
      shipping: {
        value: 42.5,
        distance: 8.5,
        deliveryMethod: 'delivery',
        orderType: '',
        scheduling: {
          date: '2026-11-18',
          endDate: '',
          dateType: 'fixed',
          time: '',
          startTime: '',
          endTime: '',
          type: 'fixed',
          appointments: [{
            id: 'legacy',
            itemIds: [],
            scheduling: { date: '2026-11-18', time: '', type: 'fixed' },
          }],
        },
      },
    } as unknown as Order;

    const { normalizedShipping } = prepareOrderForFormEditing(legacyOrder);
    const appointment = normalizedShipping.scheduling.appointments?.[0];

    expect(appointment).toMatchObject({
      deliveryMethod: 'delivery',
      freightValue: 42.5,
      distance: 8.5,
    });
    expect(normalizedShipping.value).toBe(42.5);
  });
});
