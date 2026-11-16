import { describe, expect, it } from 'vitest';
import { commercialSchedulingFormSchema } from '../../../../../shared-utils/commercialSchedulingFormSchema';
import { validateShippingScheduling } from '../../../../../shared-utils/commercialScheduling/validationRules';
import { assertValidMutationScheduling } from '../orderMutation/orderUpdateSchema';

const first = { date: '2026-11-20', time: '09:00', startTime: '09:00', type: 'fixed' as const };
const second = { date: '', time: '', startTime: '', type: 'fixed' as const };

describe('agendamentos dos itens', () => {
  it('preserva os agendamentos e suas alternativas ao aplicar o schema', () => {
    const alternatives = [{ id: 'alt', ...first }];
    const value = { ...first, appointments: [
      { id: 'one', itemIds: ['item-a'], scheduling: first },
      { id: 'two', itemIds: ['item-b'], scheduling: { ...first, alternatives } },
    ] };
    expect(commercialSchedulingFormSchema.parse(value).appointments).toEqual(value.appointments);
  });

  it('valida os agendamentos adicionais sem alterar pedidos legados', () => {
    expect(validateShippingScheduling(first)).toEqual({});
    const errors = validateShippingScheduling({ ...first, appointments: [
      { id: 'one', itemIds: ['item-a'], scheduling: first },
      { id: 'two', itemIds: [], scheduling: second },
    ] });
    expect(errors).toMatchObject({
      shipping_appointment_two_items: 'Selecione os itens deste agendamento.',
      shipping_appointment_two_date: 'Selecione uma data específica.',
      shipping_appointment_two_time: 'Selecione um horário específico.',
    });
  });

  it('aceita divisão da quantidade e rejeita excesso, item removido e quantidade inválida', () => {
    const items = [{ orderItemId: 'item-a', quantity: 3, handlingType: 'Na caixa' }];
    const appointments = [
      { id: 'one', deliveryMethod: 'delivery' as const, itemIds: ['item-a'], itemQuantities: { 'item-a': 2 }, scheduling: first },
      { id: 'two', deliveryMethod: 'delivery' as const, itemIds: ['item-a'], itemQuantities: { 'item-a': 1 }, scheduling: first },
    ];
    const value = { ...first, appointments };
    expect(commercialSchedulingFormSchema.parse(value).appointments).toEqual(appointments);
    expect(validateShippingScheduling(value, 'delivery', false, items)).toEqual({});
    const unassigned = { ...value, appointments: [appointments[0]] };
    expect(validateShippingScheduling(unassigned, 'delivery', false, items).shipping_appointment_one_items)
      .toBe('Distribua todas as unidades dos itens entre os agendamentos.');
    const excess = { ...value, appointments: [appointments[0], { ...appointments[1], itemQuantities: { 'item-a': 2 } }] };
    expect(validateShippingScheduling(excess, 'delivery', false, items).shipping_appointment_two_items)
      .toBe('A quantidade agendada supera a quantidade do pedido.');
    const removed = { ...value, appointments: [appointments[0], { ...appointments[1], itemIds: ['item-b'], itemQuantities: { 'item-b': 1 } }] };
    expect(validateShippingScheduling(removed, 'delivery', false, items).shipping_appointment_two_items)
      .toBe('Um item selecionado não está mais no pedido.');
    const invalid = { ...value, appointments: [appointments[0], { ...appointments[1], itemQuantities: { 'item-a': 0 } }] };
    expect(validateShippingScheduling(invalid, 'delivery', false, items).shipping_appointment_two_items)
      .toBe('Informe uma quantidade maior que zero para cada item selecionado.');
    const legacy = { ...value, appointments: [
      { id: 'one', deliveryMethod: 'delivery' as const, itemIds: ['item-a'], scheduling: first },
      appointments[1],
    ] };
    expect(validateShippingScheduling(legacy, 'delivery', false, items).shipping_appointment_two_items)
      .toBe('A quantidade agendada supera a quantidade do pedido.');
  });

  it('bloqueia excesso em mutação finalizada e permite rascunho incompleto', () => {
    const order = {
      status: 'scheduled',
      orderType: 'sale',
      items: [{ orderItemId: 'item-a', quantity: 1, handlingType: 'Na caixa' }],
      shipping: {
        deliveryMethod: 'delivery',
        scheduling: { ...first, appointments: [
          { id: 'one', deliveryMethod: 'delivery', itemIds: ['item-a'], itemQuantities: { 'item-a': 2 }, scheduling: first },
        ] },
      },
    } as any;
    expect(() => assertValidMutationScheduling(order)).toThrow('A quantidade agendada supera a quantidade do pedido.');
    expect(() => assertValidMutationScheduling({ ...order, status: 'draft' })).not.toThrow();
  });

  it('valida cada agendamento conforme sua modalidade e preserva modalidade legada', () => {
    const pickup = { ...second, immediatePickup: true };
    const mixed = { ...pickup, appointments: [
      { id: 'one', itemIds: ['item-a'], deliveryMethod: 'pickup' as const, scheduling: pickup },
      { id: 'two', itemIds: ['item-b'], deliveryMethod: 'delivery' as const, scheduling: second },
    ] };
    expect(commercialSchedulingFormSchema.parse(mixed).appointments).toEqual(mixed.appointments);
    expect(validateShippingScheduling(mixed, 'delivery')).toMatchObject({
      shipping_appointment_two_date: 'Selecione uma data específica.',
      shipping_appointment_two_time: 'Selecione um horário específico.',
    });
    expect(validateShippingScheduling(mixed, 'delivery').shipping_date).toBeUndefined();
    expect(validateShippingScheduling(pickup, 'pickup')).toEqual({});
    expect(validateShippingScheduling(pickup, 'delivery').shipping_date).toBeTruthy();
    const missingMethod = { ...pickup, appointments: [
      { id: 'one', itemIds: ['item-a'], scheduling: pickup },
    ] };
    expect(validateShippingScheduling(missingMethod, 'pickup').shipping_appointment_one_deliveryMethod)
      .toBe('Selecione Entrega ou Retirada para este agendamento.');
  });

  it('valida manuseio e responsável para cada agendamento e mantém fallback legado', () => {
    const items = [
      { orderItemId: 'item-a', quantity: 2, handlingType: 'Na caixa' },
      { orderItemId: 'service', quantity: 1, itemType: 'service' as const },
    ];
    const deliveryHandling = 'Na caixa > Montagem no local da entrega';
    const value = { ...first, appointments: [
      { id: 'one', deliveryMethod: 'pickup' as const, itemIds: ['item-a'], itemQuantities: { 'item-a': 1 }, scheduling: first },
      { id: 'two', deliveryMethod: 'delivery' as const, itemIds: ['item-a', 'service'], itemQuantities: { 'item-a': 1, service: 1 }, itemHandlings: { 'item-a': { handlingType: deliveryHandling } }, scheduling: first },
    ] };
    expect(validateShippingScheduling(value, 'delivery', false, items)).toMatchObject({
      'shipping_appointment_two_assembly_item-a': 'Selecione o responsável pela montagem.',
    });
    const valid = { ...value, appointments: [value.appointments[0], { ...value.appointments[1], itemHandlings: { 'item-a': { handlingType: deliveryHandling, assemblyResponsible: 'Nossa equipe' as const } } }] };
    expect(commercialSchedulingFormSchema.parse(valid).appointments).toEqual(valid.appointments);
    expect(validateShippingScheduling(valid, 'delivery', false, items)).toEqual({});
    const missing = { ...value, appointments: [value.appointments[0], { ...value.appointments[1], itemHandlings: {} }] };
    expect(validateShippingScheduling(missing, 'delivery', false, items)['shipping_appointment_two_handling_item-a']).toBe('Selecione o manuseio do item.');
  });
});
