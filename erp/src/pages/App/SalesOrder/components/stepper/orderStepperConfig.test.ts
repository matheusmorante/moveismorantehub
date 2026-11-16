import { describe, expect, it } from 'vitest';
import { getOrderStepStatus } from './orderStepperConfig';

describe('getOrderStepStatus', () => {
  it.each([
    [1, 'seller'],
    [1, 'date'],
    [1, 'status'],
    [2, 'items_summary'],
    [2, 'items'],
    [2, 'item_0_handlingType'],
    [3, 'customer_phone'],
    [3, 'customerData'],
    [4, 'shipping_appointment_a1_items'],
    [4, 'shipping'],
    [4, 'deliveryAddress_city'],
    [5, 'payment_0_method'],
    [5, 'payments_summary'],
  ])('marks step %i red for %s errors', (step, errorKey) => {
    expect(getOrderStepStatus(step, 1, { [errorKey]: 'Campo obrigatório.' })).toBe('error');
  });

  it('keeps an errored step red even when it is the active step', () => {
    expect(getOrderStepStatus(4, 4, { shipping_time: 'Selecione um horário.' })).toBe('error');
  });

  it('leaves steps without errors in their normal status', () => {
    expect(getOrderStepStatus(2, 2)).toBe('active');
    expect(getOrderStepStatus(1, 2)).toBe('done');
    expect(getOrderStepStatus(3, 2)).toBe('pending');
  });
});
