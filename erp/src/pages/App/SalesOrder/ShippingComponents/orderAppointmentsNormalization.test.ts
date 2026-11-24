import { describe, expect, it } from 'vitest';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import {
  getAppointmentDisplayState,
  getAppointments,
  getAvailableItemQuantityForAppointment,
  syncServiceToolNoticesForAppointments,
} from './orderAppointmentsNormalization';

const baseShipping: Shipping = {
  value: 50,
  distance: 12,
  deliveryMethod: 'delivery',
  orderType: 'sale',
  scheduling: { date: '2026-11-25', time: '09:00', startTime: '09:00', type: 'fixed' },
};

const items = [
  { orderItemId: 'i1', description: 'Mesa', quantity: 2 },
  { orderItemId: 'i2', description: 'Instalação', quantity: 1, itemType: 'service' },
] as Item[];

describe('orderAppointmentsNormalization', () => {
  it('projeta operação principal com frete legado e calcula saldo disponível restante', () => {
    const appointments = getAppointments(baseShipping, items, false);
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({ id: 'principal', deliveryMethod: 'delivery', freightValue: 50, distance: 12 });

    const split = [
      { ...appointments[0], itemIds: ['i1'], itemQuantities: { i1: 1 } },
      { id: 'op-2', itemIds: [], itemQuantities: {}, scheduling: baseShipping.scheduling },
    ];
    expect(getAvailableItemQuantityForAppointment(split, 'op-2', items[0])).toBe(1);
  });

  it('sincroniza avisos de serviço e resume estado de exibição sem mutar entradas', () => {
    const [principal] = getAppointments(baseShipping, items, false);
    const synced = syncServiceToolNoticesForAppointments([principal], items);
    expect(synced.changed).toBe(true);
    expect(synced.appointments[0].notices?.instructions).toBeTruthy();

    const view = getAppointmentDisplayState({
      appointment: principal,
      index: 0,
      shipping: baseShipping,
      errors: {},
      schedulingValidationErrors: {},
      isNewSaleFlow: false,
      isSale: true,
      cardMachineRequired: false,
    });
    expect(view.isDelivery).toBe(true);
    expect(view.desktopScheduleSummary).toContain('Frete R$ 50,00');
    expect(view.mobileScheduleSummary).toContain('2 itens');
  });
});
