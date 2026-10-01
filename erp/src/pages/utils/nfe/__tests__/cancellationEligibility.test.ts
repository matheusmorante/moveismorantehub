import { describe, expect, it } from 'vitest';
import { hasGoodsCirculated } from '../cancellationEligibility';

describe('hasGoodsCirculated', () => {
  it('reconhece entrega e retirada pelo estado interno fulfilled', () => {
    expect(hasGoodsCirculated({ status: 'fulfilled' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'fulfilled', delivery_method: 'pickup' })).toBe(true);
  });

  it('reconhece estados legados de conclusão como circulação', () => {
    expect(hasGoodsCirculated({ status: 'Atendido' })).toBe(true);
    expect(hasGoodsCirculated({ status: 'completed' })).toBe(true);
  });

  it('mantém pedidos agendados e aguardando retirada sem circulação', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'scheduled' })).toBe(false);
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'awaiting_pickup' })).toBe(
      false
    );
  });

  it('reconhece circulação quando a mercadoria já está em trânsito', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', delivery_status: 'in_transit' })).toBe(true);
  });

  it('reconhece os campos camelCase do pedido retornado pela interface', () => {
    expect(hasGoodsCirculated({ status: 'scheduled', deliveryStatus: 'collected' })).toBe(true);
    expect(
      hasGoodsCirculated({ status: 'scheduled', pickupConfirmedAt: '2026-10-01T12:00:00Z' })
    ).toBe(true);
  });
});
