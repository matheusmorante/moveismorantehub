import { describe, it, expect } from 'vitest';
import { buildDeliveryChecklist } from '../deliveryChecklist';

describe('deliveryChecklist — Checklist do Fluxo de Entrega', () => {
  it('inclui "Carregado: Máquina de cartão" quando marcado em shipping.bringCardMachine = true', () => {
    const order = {
      id: 'ord-1',
      items: [{ description: 'Cadeira Gamer', quantity: 1, volumes: 1 }],
      shipping: {
        bringCardMachine: true,
      },
    };

    const checklist = buildDeliveryChecklist(order);
    const cardItem = checklist.find((item) => item.id === 'card_machine');

    expect(cardItem).toBeDefined();
    expect(cardItem?.label).toBe('Carregado: Máquina de cartão');
  });

  it('NÃO inclui máquina de cartão quando bringCardMachine = false e sem pendência de cartão', () => {
    const order = {
      id: 'ord-2',
      items: [{ description: 'Mesa de Centro', quantity: 1 }],
      shipping: {
        bringCardMachine: false,
      },
      payments: [{ method: 'Pix', status: 'pago', amount: 500 }],
    };

    const checklist = buildDeliveryChecklist(order);
    const cardItem = checklist.find((item) => item.id === 'card_machine');

    expect(cardItem).toBeUndefined();
  });

  it('inclui "Ligar antes de sair" quando marcado em shipping.callBeforeDelivery = true', () => {
    const order = {
      id: 'ord-3',
      items: [{ description: 'Sofá 3 Lugares', quantity: 1, volumes: 2 }],
      shipping: {
        callBeforeDelivery: true,
      },
    };

    const checklist = buildDeliveryChecklist(order);
    const callItem = checklist.find((item) => item.id === 'call_customer');

    expect(callItem).toBeDefined();
    expect(callItem?.label).toBe('Ligar antes de sair');
  });

  it('NÃO inclui "Ligar antes de sair" quando callBeforeDelivery = false e sem observações', () => {
    const order = {
      id: 'ord-4',
      items: [{ description: 'Poltrona', quantity: 1 }],
      shipping: {
        callBeforeDelivery: false,
      },
    };

    const checklist = buildDeliveryChecklist(order);
    const callItem = checklist.find((item) => item.id === 'call_customer');

    expect(callItem).toBeUndefined();
  });

  it('inclui ambos "Carregado: Máquina de cartão" e "Ligar antes de sair" quando ambos marcados na logística', () => {
    const order = {
      id: 'ord-5',
      items: [
        { description: 'Guarda-Roupa Casal', quantity: 1, volumes: 4 },
        { description: 'Criado-Mudo', quantity: 2, volumes: 1 },
      ],
      shipping: {
        bringCardMachine: true,
        callBeforeDelivery: true,
      },
    };

    const checklist = buildDeliveryChecklist(order);

    expect(checklist).toEqual([
      { id: expect.stringContaining('item_'), label: 'Carregado: Guarda-Roupa Casal (4 vol)' },
      { id: expect.stringContaining('item_'), label: 'Carregado: 2x Criado-Mudo (1 vol)' },
      { id: 'card_machine', label: 'Carregado: Máquina de cartão' },
      { id: 'call_customer', label: 'Ligar antes de sair' },
    ]);
  });

  it('suporta aliases adicionais de propriedades de logística (takeCardMachine, callBeforeLeaving)', () => {
    const order = {
      id: 'ord-alias',
      items: [{ description: 'Estante', quantity: 1 }],
      shipping: {
        takeCardMachine: true,
        callBeforeLeaving: true,
      },
    };

    const checklist = buildDeliveryChecklist(order);

    expect(checklist.some((it) => it.label === 'Carregado: Máquina de cartão')).toBe(true);
    expect(checklist.some((it) => it.label === 'Ligar antes de sair')).toBe(true);
  });

  it('suporta pedido com dados aninhados dentro de order_data (formato PostgreSQL)', () => {
    const order = {
      id: 'ord-6',
      order_data: {
        items: [{ description: 'Cama Box Queen', quantity: 1, volumes: 2 }],
        shipping: {
          bringCardMachine: true,
          callBeforeDelivery: true,
        },
      },
    };

    const checklist = buildDeliveryChecklist(order);

    expect(checklist.some((it) => it.label === 'Carregado: Cama Box Queen (2 vol)')).toBe(true);
    expect(checklist.some((it) => it.label === 'Carregado: Máquina de cartão')).toBe(true);
    expect(checklist.some((it) => it.label === 'Ligar antes de sair')).toBe(true);
  });

  it('inclui máquina de cartão se houver pagamento com cartão pendente na entrega mesmo sem flag explícita', () => {
    const order = {
      id: 'ord-7',
      items: [{ description: 'Painel de TV', quantity: 1 }],
      shipping: {
        bringCardMachine: false,
      },
      payments: [
        { method: 'Cartão de Crédito', status: 'Pendente', amount: 800 },
      ],
    };

    const checklist = buildDeliveryChecklist(order);
    const cardItem = checklist.find((item) => item.id === 'card_machine');

    expect(cardItem).toBeDefined();
    expect(cardItem?.label).toBe('Carregado: Máquina de cartão');
  });

  it('reconhece tags de aviso geradas pelo ERP nas observações', () => {
    const order = {
      id: 'ord-8',
      items: [{ description: 'Mesa com 4 Cadeiras', quantity: 1 }],
      observation: '[Levar máquina de cartão] [Ligar antes da entrega]',
    };

    const checklist = buildDeliveryChecklist(order);

    expect(checklist.some((it) => it.label === 'Carregado: Máquina de cartão')).toBe(true);
    expect(checklist.some((it) => it.label === 'Ligar antes de sair')).toBe(true);
  });

  it('formata adequadamente tempo de antecedência se explicitado nas observações', () => {
    const order = {
      id: 'ord-9',
      items: [{ description: 'Cômoda', quantity: 1 }],
      observation: 'Ligar 30 min antes da entrega para abrir o portão',
    };

    const checklist = buildDeliveryChecklist(order);
    const callItem = checklist.find((item) => item.id === 'call_customer');

    expect(callItem?.label).toBe('Ligar antes de sair (30 minutos de antecedência)');
  });

  it('inclui item de serra-copo quando especificado em item com passa-fio ou recorte', () => {
    const order = {
      id: 'ord-10',
      items: [{ description: 'Balcão de Atendimento com passa-fio', quantity: 1 }],
      shipping: {
        bringCardMachine: true,
        callBeforeDelivery: true,
      },
    };

    const checklist = buildDeliveryChecklist(order);

    expect(checklist.some((it) => it.id === 'card_machine' && it.label === 'Carregado: Máquina de cartão')).toBe(true);
    expect(checklist.some((it) => it.id === 'call_customer' && it.label === 'Ligar antes de sair')).toBe(true);
    expect(checklist.some((it) => it.id === 'hole_saw')).toBe(true);
  });
});
