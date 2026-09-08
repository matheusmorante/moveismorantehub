import { describe, expect, it } from 'vitest';
import { checkOutOfOrderRisk } from './deliveryRouteRisk';
import { getDeliverySchedulePeriod } from './deliverySchedulePeriod';
import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';

describe('getDeliverySchedulePeriod', () => {
  it('preserva janela de atendimento para ordenação', () => {
    expect(getDeliverySchedulePeriod({ scheduling: { startTime: '13:00', endTime: '18:00' } })).toMatchObject({
      label: '13:00–18:00',
      isFixed: false,
      sortWeight: 780,
    });
  });

  it('identifica horário combinado como restrição fixa', () => {
    expect(getDeliverySchedulePeriod({ scheduling: { type: 'fixed', startTime: '10:30' } })).toMatchObject({
      label: '🔒 10:30',
      isFixed: true,
      sortWeight: 630,
    });
  });
});

describe('checkOutOfOrderRisk', () => {
  const createRouteItem = (overrides: Partial<DeliveryRouteItem>): DeliveryRouteItem => ({
    id: 'order',
    order: {},
    customerName: 'Cliente',
    fullAddress: 'Curitiba',
    itemsCount: 1,
    sequence: 1,
    status: 'pending',
    coords: null,
    hasValidCoords: false,
    isCurrent: false,
    isNext: false,
    periodLabel: '13:00–18:00',
    isFixedTime: false,
    ...overrides,
  });

  const routeItems = [
    createRouteItem({ id: 'fixed', isFixedTime: true, restrictionLevel: 'fixed', periodLabel: '🔒 09:00', customerName: 'Cliente Fixo', orderIndex: '000001' }),
    createRouteItem({ id: 'free', restrictionLevel: 'free', customerName: 'Cliente Livre', orderIndex: '000002' }),
  ];

  it('alerta ao pular entrega anterior de horário fixo', () => {
    expect(checkOutOfOrderRisk(routeItems[1], routeItems)).toMatchObject({
      hasRisk: true,
      riskyItemName: 'Cliente Fixo',
      riskyOrderCode: '000001',
    });
  });

  it('não alerta para a primeira entrega pendente', () => {
    expect(checkOutOfOrderRisk(routeItems[0], routeItems)).toEqual({ hasRisk: false });
  });
});
