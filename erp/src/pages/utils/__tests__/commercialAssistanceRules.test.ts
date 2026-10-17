import { describe, it, expect } from 'vitest';
import { validateAssistanceOrder } from '../../../../../shared-utils/commercialAssistanceRules';
import { validateOrder } from '../../../../../shared-utils/commercialOrderRules';
import type Order from '@/pages/types/order.type';

describe('commercialAssistanceRules - Vínculo opcional de pedido', () => {
  const baseAssistanceOrder: Partial<Order> = {
    id: 'ast-101',
    orderType: 'assistance',
    status: 'scheduled',
    date: '2026-10-16T12:00:00.000Z',
    seller: 'Atendente Lucas',
    assistanceDescription: 'Regulagem das portas do armário que estão raspando',
    customerData: {
      id: 'cust-1',
      fullName: 'Maria da Silva',
      phone: '41999998888',
      noPhone: false,
      fullAddress: {
        cep: '80000-000',
        street: 'Rua das Palmeiras',
        number: '123',
        neighborhood: 'Batel',
        city: 'Curitiba',
        state: 'PR',
      },
    },
    shipping: {
      deliveryMethod: 'delivery',
      scheduling: {
        date: '2026-10-20',
        startTime: '14:00',
        endTime: '16:00',
        type: 'range',
      },
    },
    items: [],
    assistanceItems: [],
    assistanceCost: 0,
    assistanceServiceValue: 0,
  };

  it('permite criar e validar assistência SEM pedido vinculado (pedido de origem não está no ERP)', () => {
    const unlinkedOrder = {
      ...baseAssistanceOrder,
      linkedOrderId: undefined,
      items: [],
      assistanceItems: [],
    } as unknown as Order;

    const errors = validateAssistanceOrder(unlinkedOrder, {
      assistanceOrder: { customer: true, seller: true },
    });

    // Não deve conter erro de items_summary nem de vínculo
    expect(errors).toEqual({});
    expect(errors['items_summary']).toBeUndefined();
  });

  it('permite criar assistência desvinculada contendo peças ou serviços extras avulsos', () => {
    const unlinkedWithItems = {
      ...baseAssistanceOrder,
      linkedOrderId: undefined,
      assistanceItems: [],
      items: [
        {
          description: 'Puxador cromado 160mm',
          quantity: 2,
          unitPrice: 25,
          unitDiscount: 0,
          discountType: 'fixed',
          handlingType: 'Standard',
        },
      ],
    } as unknown as Order;

    const errors = validateAssistanceOrder(unlinkedWithItems, {
      assistanceOrder: { customer: true, seller: true },
    });

    expect(errors).toEqual({});
  });

  it('obriga informar a descrição do serviço quando o campo estiver vazio', () => {
    const orderWithoutDescription = {
      ...baseAssistanceOrder,
      assistanceDescription: '   ',
    } as unknown as Order;

    const errors = validateAssistanceOrder(orderWithoutDescription);
    expect(errors['assistanceDescription']).toBe('Descrição do serviço é obrigatória.');
  });

  it('quando o operador opta por vincular um pedido, exige que ao menos um item seja selecionado ou adicionado', () => {
    const linkedOrderWithoutItems = {
      ...baseAssistanceOrder,
      linkedOrderId: 'sale-999',
      assistanceItems: [],
      items: [],
    } as unknown as Order;

    const errors = validateAssistanceOrder(linkedOrderWithoutItems);
    expect(errors['items_summary']).toBe(
      'Como há um pedido vinculado, selecione pelo menos um item do pedido original ou adicione uma peça/serviço.'
    );
  });

  it('valida com sucesso quando o operador vincula um pedido e seleciona um item da venda original', () => {
    const linkedOrderWithAssistanceItem = {
      ...baseAssistanceOrder,
      linkedOrderId: 'sale-999',
      assistanceItems: [
        {
          id: 'item-1',
          description: 'Guarda Roupa Florença Mopar',
          quantity: 1,
          originalOrderId: 'sale-999',
        },
      ],
      items: [],
    } as unknown as Order;

    const errors = validateAssistanceOrder(linkedOrderWithAssistanceItem);
    expect(errors['items_summary']).toBeUndefined();
    expect(errors).toEqual({});
  });

  it('validateOrder geral não bloqueia assistência desvinculada por falta de itens', () => {
    const unlinkedOrder = {
      ...baseAssistanceOrder,
      linkedOrderId: undefined,
      items: [],
      assistanceItems: [],
      payments: [],
    } as unknown as Order;

    const errors = validateOrder(unlinkedOrder);
    expect(errors['items_summary']).toBeUndefined();
  });
});
