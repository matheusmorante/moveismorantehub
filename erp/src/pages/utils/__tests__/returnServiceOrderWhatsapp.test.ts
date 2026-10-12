import { describe, expect, it, vi } from 'vitest';
import type Order from '../../types/order.type';
import { buildReturnServiceOrderMessage } from '../whatsappTemplates';

vi.mock('../maps', () => ({ getShippingRouteUrl: vi.fn(() => '') }));
vi.mock('../orderCode', () => ({
  formatOrderCode: (order: Order) => String(order.orderIndex || order.id || ''),
}));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({}) }));

const returnOrder = {
  id: 'return-order',
  orderIndex: 800123,
  orderType: 'return',
  status: 'scheduled',
  returnMethod: 'store_collection',
  linkedOrderCode: '000456',
  customerData: {
    fullName: 'Cliente sintético',
    phone: '(41) 99999-0000',
    fullAddress: {
      street: 'Rua Teste',
      number: '10',
      neighborhood: 'Centro',
      city: 'Curitiba',
      state: 'PR',
    },
  },
  shipping: {
    scheduling: { date: '2026-10-15', startTime: '10:00', time: '10:00', type: 'fixed' },
  },
  collectionObservation: 'Acessar pelo portão lateral.',
  items: [{ quantity: 1, description: 'Produto sintético' }],
  seller: 'Vendedor sintético',
} as unknown as Order;

describe('mensagem WhatsApp do pedido de devolução', () => {
  it('envia ao cliente os dados do pedido e o agendamento sem observação interna da equipe', () => {
    const message = buildReturnServiceOrderMessage(returnOrder, 'customer');

    expect(message).toContain('PEDIDO DE DEVOLUÇÃO');
    expect(message).toContain('#800123');
    expect(message).toContain('#000456');
    expect(message).toContain('Coleta agendada');
    expect(message).toContain('15/10/2026');
    expect(message).toContain('10:00');
    expect(message).toContain('1x Produto sintético');
    expect(message).not.toContain('portão lateral');
  });

  it('envia à equipe endereço e observações da coleta', () => {
    const message = buildReturnServiceOrderMessage(returnOrder, 'team');

    expect(message).toContain('*Telefone do cliente:* (41) 99999-0000');
    expect(message).toContain('*Endereço:*');
    expect(message).toContain('Rua Teste');
    expect(message).toContain('*Observações da coleta:* Acessar pelo portão lateral.');
    expect(message).toContain('Vendedor sintético');
  });

  it('identifica como devolvido o pedido que o cliente já trouxe à loja', () => {
    const message = buildReturnServiceOrderMessage(
      { ...returnOrder, status: 'fulfilled', returnMethod: 'store_delivery' },
      'customer'
    );

    expect(message).toContain('*Situação:* Devolvido');
    expect(message).not.toContain('Data da coleta');
  });
});
