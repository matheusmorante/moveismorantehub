import { describe, expect, it } from 'vitest';
import { getGoodsCirculationState, hasGoodsCirculated } from '../cancellationEligibility';

describe('hasGoodsCirculated', () => {
  it('reconhece entrega e retirada pelo estado interno fulfilled', () => {
    expect(hasGoodsCirculated({ status: 'fulfilled' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'fulfilled', delivery_method: 'pickup' })).toBe(true);
  });

  it('reconhece o estado operacional concluído como entrega confirmada', () => {
    expect(hasGoodsCirculated({ status: 'Atendido' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'completed' })).toBe(false);
  });

  it('mantém pedidos agendados e aguardando retirada sem circulação', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'scheduled' })).toBe(false);
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'awaiting_pickup' })).toBe(
      false
    );
  });

  it('considera saída e trânsito como circulação que bloqueia cancelamento', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'in_transit' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'scheduled', deliveryStatus: 'out_for_delivery' })).toBe(true);
    expect(getGoodsCirculationState({ status: 'scheduled', delivery_status: 'in_transit' })).toBe('in_progress');
    expect(hasGoodsCirculated({ status: 'scheduled', deliveryStatus: 'completed' })).toBe(false);
    expect(
      hasGoodsCirculated({ status: 'scheduled', delivery_started_at: '2026-10-01T12:00:00Z' })
    ).toBe(true);
    expect(
      hasGoodsCirculated({ status: 'scheduled', delivery_arrived_at: '2026-10-01T12:00:00Z' })
    ).toBe(true);
    expect(
      hasGoodsCirculated({ status: 'scheduled', delivery_finished_at: '2026-10-01T12:00:00Z' })
    ).toBe(true);
  });

  it('reconhece entrega e retirada explicitamente concluídas', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', deliveryStatus: 'delivered' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'scheduled', deliveryStatus: 'retirado' })).toBe(true);
    expect(
      hasGoodsCirculated({ status: 'scheduled', pickupConfirmedAt: '2026-10-01T12:00:00Z' })
    ).toBe(true);
  });

  it('não deixa flag automática antiga liberar cancelamento de pedido fulfilled', () => {
    expect(
      hasGoodsCirculated({
        status: 'fulfilled',
        order_data: {
          autoFulfilledAfter12h: true,
          deliveryStatus: 'completed',
          deliveryFinishedAt: '2026-10-01T12:00:00Z',
        },
      })
    ).toBe(true);
  });
});
