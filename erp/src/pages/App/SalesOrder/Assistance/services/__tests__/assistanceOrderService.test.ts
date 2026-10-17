import { describe, it, expect } from 'vitest';
import {
  calcAssistanceItemsSummary,
  isAssistanceFormBlank,
  buildAssistanceOrderPayload,
} from '../assistanceOrderService';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';

describe('assistanceOrderService', () => {
  const dummyCustomer: CustomerData = {
    fullName: 'Lucas Oliveira',
    phone: '41988887777',
    noPhone: false,
    fullAddress: {
      cep: '80000-000',
      street: 'Rua das Flores',
      number: '10',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    },
  };

  it('calcula sumário de peças/itens corretamente', () => {
    const items: Item[] = [
      { description: 'Dobradiça reforçada', quantity: 4, unitPrice: 15, costPrice: 5 } as Item,
      { description: 'Puxador', quantity: 2, unitPrice: 20, costPrice: 8 } as Item,
    ];

    const summary = calcAssistanceItemsSummary(items);
    expect(summary.totalQuantity).toBe(6);
    expect(summary.itemsSubtotal).toBe(100); // 4*15 + 2*20 = 60 + 40 = 100
    expect(summary.totalItemsCost).toBe(36); // 4*5 + 2*8 = 20 + 16 = 36
  });

  it('detecta quando o formulário de assistência está totalmente em branco', () => {
    const blankCustomer: CustomerData = {
      fullName: '',
      phone: '',
      noPhone: false,
      fullAddress: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '' },
    };

    expect(isAssistanceFormBlank(blankCustomer, '', '', [], [])).toBe(true);
    expect(isAssistanceFormBlank(dummyCustomer, '', '', [], [])).toBe(false);
    expect(isAssistanceFormBlank(blankCustomer, 'Troca de peça', '', [], [])).toBe(false);
  });

  it('monta payload de pedido de assistência desvinculado (sem linkedOrderId)', () => {
    const payload = buildAssistanceOrderPayload({
      currentOrderId: 'ast-500',
      isDraft: false,
      status: 'scheduled',
      customerData: dummyCustomer,
      description: 'Regulagem de gavetas',
      observation: 'Cliente prefere atendimento no período da tarde',
      scheduling: {
        date: '2026-10-25',
        startTime: '14:00',
        endTime: '16:00',
        type: 'range',
      },
      isLinked: false,
      linkedOrderId: '',
      selectedAssistanceItems: [],
      extraItems: [],
      assistanceCost: 20,
      assistanceServiceValue: 80,
      seller: 'Vendedora Paula',
    });

    expect(payload.id).toBe('ast-500');
    expect(payload.orderType).toBe('assistance');
    expect(payload.status).toBe('scheduled');
    expect(payload.linkedOrderId).toBeUndefined();
    expect(payload.assistanceItems).toEqual([]);
    expect(payload.assistanceDescription).toBe('Regulagem de gavetas');
    expect(payload.assistanceServiceValue).toBe(80);
    expect(payload.assistanceCost).toBe(20);
    expect(payload.paymentsSummary?.totalOrderValue).toBe(80);
  });

  it('monta payload de pedido de assistência com vínculo quando isLinked e linkedOrderId estão preenchidos', () => {
    const payload = buildAssistanceOrderPayload({
      currentOrderId: 'ast-501',
      isDraft: false,
      status: 'scheduled',
      customerData: dummyCustomer,
      description: 'Troca de tampo danificado',
      observation: '',
      scheduling: {
        date: '2026-10-26',
        startTime: '10:00',
        endTime: '',
        type: 'fixed',
      },
      isLinked: true,
      linkedOrderId: 'sale-1234',
      selectedAssistanceItems: [
        {
          id: 'item-1',
          description: 'Mesa de Jantar',
          quantity: 1,
          originalOrderId: 'sale-1234',
        },
      ],
      extraItems: [],
      assistanceCost: 0,
      assistanceServiceValue: 0,
      seller: 'Vendedor João',
    });

    expect(payload.linkedOrderId).toBe('sale-1234');
    expect(payload.assistanceItems).toHaveLength(1);
    expect(payload.assistanceItems[0].description).toBe('Mesa de Jantar');
  });
});
