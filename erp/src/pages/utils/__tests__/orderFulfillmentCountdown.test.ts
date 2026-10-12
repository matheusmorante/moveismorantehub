import { describe, expect, it } from 'vitest';
import type Order from '../../types/order.type';
import {
  getOrderFulfillmentCountdown,
  parseReturnCollectionDeadline,
} from '../orderFulfillmentCountdown';

const collectionOrder = (schedule: Record<string, unknown> = {}) =>
  ({
    id: 'return-collection-1',
    orderType: 'return',
    returnMethod: 'store_collection',
    status: 'scheduled',
    shipping: { scheduling: { date: '2026-10-10', type: 'fixed', ...schedule } },
  }) as unknown as Order;

const scheduledSale = (deliveryMethod: 'delivery' | 'pickup' = 'delivery') =>
  ({
    id: `sale-${deliveryMethod}`,
    orderType: 'sale',
    status: 'scheduled',
    shipping: { deliveryMethod, scheduling: { date: '2026-10-10', type: 'fixed' } },
  }) as unknown as Order;

describe('prazo do Cron para entrega e retirada', () => {
  it.each(['delivery', 'pickup'] as const)(
    'conta até a meia-noite seguinte para pedido de %s no dia agendado',
    (deliveryMethod) => {
      const order = scheduledSale(deliveryMethod);
      const now = new Date(2026, 9, 10, 23, 59);

      expect(getOrderFulfillmentCountdown(order, undefined, now)).toMatchObject({
        isPastDelivery: true,
        isExpired: false,
        countdownLabel: '1min',
        deadline: new Date(2026, 9, 11, 0, 0),
      });
    }
  );

  it('indica atualização pendente depois da meia-noite, sem gravar pelo navegador', () => {
    const order = scheduledSale();

    expect(
      getOrderFulfillmentCountdown(order, undefined, new Date(2026, 9, 11, 0, 1))
    ).toMatchObject({
      isPastDelivery: true,
      isExpired: true,
      countdownLabel: 'aguardando atualização',
    });
  });

  it('não mostra contagem antes do dia agendado', () => {
    const order = {
      ...scheduledSale(),
      shipping: { deliveryMethod: 'delivery', scheduling: { date: '2026-10-11' } },
    } as Order;

    expect(
      getOrderFulfillmentCountdown(order, undefined, new Date(2026, 9, 10, 23, 59))
    ).toMatchObject({
      isPastDelivery: false,
      isExpired: false,
      countdownLabel: '',
    });
  });
});

describe('prazo de coleta agendada da devolução', () => {
  it('vence à meia-noite após o dia da coleta, mesmo com horário específico', () => {
    const order = collectionOrder({
      date: '2026-10-10',
      startTime: '10:00',
      endTime: '15:30',
      time: '10:00 - 15:30',
    });

    expect(parseReturnCollectionDeadline(order)).toEqual(new Date(2026, 9, 11, 0, 0));
    expect(
      getOrderFulfillmentCountdown(order, undefined, new Date(2026, 9, 10, 23, 59))
    ).toMatchObject({
      isExpired: false,
      hoursRemaining: 1,
      countdownLabel: 'Devolvido automaticamente em 1min',
    });
  });

  it.each(['dateType', 'type'] as const)(
    'usa o último dia da janela (%s=range) e ignora o horário final',
    (rangeKey) => {
      const order = collectionOrder({
        date: '2026-10-10',
        endDate: '2026-10-12',
        [rangeKey]: 'range',
        endTime: '15:30',
      });
      const now = new Date(2026, 9, 12, 23, 59);

      expect(parseReturnCollectionDeadline(order)).toEqual(new Date(2026, 9, 13, 0, 0));
      expect(getOrderFulfillmentCountdown(order, undefined, now)).toMatchObject({
        isExpired: false,
        countdownLabel: 'Devolvido automaticamente em 1min',
      });
    }
  );

  it('aguarda atualização do Cron depois da meia-noite', () => {
    const order = collectionOrder({ date: '2026-10-10' });

    expect(
      getOrderFulfillmentCountdown(order, undefined, new Date(2026, 9, 11, 0, 5))
    ).toMatchObject({
      isPastDelivery: true,
      isExpired: true,
      countdownLabel: 'aguardando atualização',
    });
  });

  it('não define prazo enquanto o agendamento está pendente', () => {
    expect(
      parseReturnCollectionDeadline(collectionOrder({
        date: '2026-10-10',
        pendingScheduling: true,
      }))
    ).toBeNull();
  });

  it('não conta prazo de coleta quando a devolução já foi entregue na loja', () => {
    const order = {
      ...collectionOrder({ date: '2026-10-10' }),
      returnMethod: 'store_delivery',
    } as Order;

    expect(parseReturnCollectionDeadline(order)).toBeNull();
    expect(
      getOrderFulfillmentCountdown(order, undefined, new Date(2026, 9, 10, 15, 0))
    ).toMatchObject({
      isExpired: false,
      countdownLabel: '',
      deadline: null,
    });
  });
});
