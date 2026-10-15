// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import ReturnOrderModal from './ReturnOrderModal';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  saveOrder: vi.fn(),
  autoTransmitReturnFiscal: vi.fn(),
  getAutoTransmissionNotice: vi.fn(),
}));

vi.mock('../../../utils/supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('../../../utils/orderHistoryService', () => ({ saveOrder: mocks.saveOrder }));
vi.mock('../../FiscalDocuments/services/automaticReturnFiscalEmissionService', () => ({
  automaticallyTransmitReturnFiscalDocuments: mocks.autoTransmitReturnFiscal,
  getAutomaticReturnFiscalEmissionNotice: mocks.getAutoTransmissionNotice,
}));
vi.mock('./ReturnItemsSelection', async () => {
  const React = await import('react');
  return {
    default: ({ order, returnableQuantities, onToggle }: any) =>
      React.createElement(
        'div',
        null,
        order.items.map((item: any, index: number) => {
          const key = `line-${index}`;
          const max = returnableQuantities[key] || 0;
          return React.createElement(
            'button',
            {
              key,
              type: 'button',
              disabled: max <= 0,
              onClick: () => onToggle(key, max, item.unitPrice),
            },
            item.description
          );
        })
      ),
  };
});
vi.mock('./ReturnCollectionSection', async () => {
  const React = await import('react');
  return {
    default: ({ onCollectChange, onSchedulingChange }: any) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          { type: 'button', onClick: () => onCollectChange(false) },
          'Cliente devolveu na loja'
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            onClick: () => {
              onCollectChange(true);
              onSchedulingChange('date', '2026-10-15');
              onSchedulingChange('startTime', '10:00');
            },
          },
          'Agendar coleta'
        )
      ),
  };
});
vi.mock('../components/ReturnFormTabs', async () => {
  const React = await import('react');
  return {
    default: ({ onChange }: any) =>
      React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          { type: 'button', onClick: () => onChange('items') },
          'Itens'
        ),
        React.createElement(
          'button',
          { type: 'button', onClick: () => onChange('collection') },
          'Coleta da devolução'
        )
      ),
  };
});

const order = {
  id: 'sale-order',
  orderType: 'sale',
  status: 'fulfilled',
  items: [
    {
      id: 'line-1',
      productId: 'product-1',
      code: 'SKU-1',
      description: 'Cadeira',
      quantity: 1,
      unitPrice: 100,
    },
  ],
  itemsSummary: { totalQuantity: 1 },
  shipping: {
    value: 0,
    deliveryMethod: 'delivery',
    orderType: 'standard',
    scheduling: { date: '', time: '', type: 'fixed' },
  },
  seller: 'Teste',
  payments: [],
  paymentsSummary: { totalOrderValue: 100 },
  customerData: { fullName: 'Cliente sintético' },
  observation: '',
  date: '2026-10-01T12:00:00Z',
} as unknown as Order;

const authorizedInvoice = {
  id: 'source-nfe',
  order_id: order.id,
  status: 'autorizada',
  document_type: 'outbound',
  ambiente: 1,
  modelo: '55',
};

describe('cadastro e ações do pedido de devolução', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    mocks.saveOrder.mockResolvedValue('return-order');
    mocks.autoTransmitReturnFiscal.mockResolvedValue({
      status: 'authorized',
      authorizedDocuments: 1,
      pendingDocuments: 0,
      failedDocuments: 0,
    });
    mocks.getAutoTransmissionNotice.mockReturnValue(null);
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        hasAuthorizedInvoice: true,
        lines: [
          {
            originalDocumentId: 'source-nfe',
            originalItemNumber: 1,
            productCode: 'SKU-1',
            description: 'Cadeira',
            availableQuantity: 1,
          },
        ],
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  const setupSupabaseFrom = (nfeDocs: any[] = [], priorReturns: any[] = []) => {
    mocks.from.mockImplementation((table: string) => {
      const query: any = {};
      query.select = vi.fn(() => query);
      query.eq = vi.fn(() => query);
      query.in = vi.fn(() => query);
      query.order = vi.fn(() => query);
      query.or = vi.fn(async () => ({ data: priorReturns, error: null }));
      // biome-ignore lint/suspicious/noThenProperty: intentional mock of Supabase thenable query
      query.then = (resolve: any, reject: any) =>
        Promise.resolve({
          data: table === 'nfe_documents' ? nfeDocs : priorReturns,
          error: null,
        }).then(resolve, reject);
      return query;
    });
  };

  it('não inicia emissão quando a venda não tem documento fiscal autorizado', async () => {
    setupSupabaseFrom([]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain(
      'Esta venda não possui documento fiscal emitido. A devolução será registrada sem emissão de nota fiscal de devolução.'
    );
    expect(notice.textContent).not.toContain('Não foi possível confirmar a NF-e original');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('bloqueia a devolução quando não consegue conferir as devoluções anteriores', async () => {
    setupSupabaseFrom([]);
    const originalFrom = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) => {
      const query = originalFrom(table);
      if (table === 'orders') query.or.mockResolvedValue({ data: null, error: { code: 'NETWORK' } });
      return query;
    });
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('saldo já devolvido');
    expect(screen.getByRole('button', { name: 'Conferência indisponível' })).toHaveProperty('disabled', true);
    expect(mocks.saveOrder).not.toHaveBeenCalled();
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('não trata erro na consulta fiscal como ausência de nota autorizada', async () => {
    setupSupabaseFrom([]);
    const originalFrom = mocks.from.getMockImplementation()!;
    mocks.from.mockImplementation((table: string) => {
      const query = originalFrom(table);
      if (table === 'nfe_documents') query.then = (resolve: any) => Promise.resolve({ data: null, error: { code: 'NETWORK' } }).then(resolve);
      return query;
    });
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('nota fiscal autorizada');
    expect(screen.getByRole('button', { name: 'Conferência indisponível' })).toHaveProperty('disabled', true);
    expect(mocks.saveOrder).not.toHaveBeenCalled();
  });

  it('bloqueia a devolução sem venda original persistida', async () => {
    setupSupabaseFrom([]);
    render(<ReturnOrderModal order={{ ...order, id: undefined }} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toContain('venda original já cadastrada');
    expect(mocks.saveOrder).not.toHaveBeenCalled();
  });

  it('encerra a espera e bloqueia criação quando a consulta não responde', async () => {
    vi.useFakeTimers();
    try {
      setupSupabaseFrom([]);
      const originalFrom = mocks.from.getMockImplementation()!;
      mocks.from.mockImplementation((table: string) => {
        const query = originalFrom(table);
        if (table === 'orders') query.or.mockImplementation(() => new Promise(() => {}));
        return query;
      });
      render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
      await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
      expect(screen.getByRole('alert').textContent).toContain('demorou mais que o esperado');
      expect(screen.getByRole('button', { name: 'Conferência indisponível' })).toHaveProperty('disabled', true);
      expect(mocks.saveOrder).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('trata documentos rejeitados/cancelados como venda sem nota fiscal emitida', async () => {
    setupSupabaseFrom([
      { id: 'doc-canc', status: 'cancelada', document_type: 'outbound', modelo: '55', ambiente: 1 },
      { id: 'doc-rej', status: 'rejeitada', document_type: 'outbound', modelo: '55', ambiente: 1 },
    ]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain(
      'Esta venda não possui documento fiscal emitido. A devolução será registrada sem emissão de nota fiscal de devolução.'
    );
    expect(notice.textContent).not.toContain('Não foi possível confirmar a NF-e original');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('explica o disparo automático depois que o retorno físico é confirmado', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain('NF-e de devolução será transmitida automaticamente');
    expect(notice.textContent).toContain('protocolo da SEFAZ confirma a autorização');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('registra uma segunda devolução para a mesma venda usando apenas outra linha ainda disponível', async () => {
    const multiItemOrder = {
      ...order,
      items: [
        order.items[0],
        {
          ...order.items[0],
          id: 'line-2',
          productId: 'product-2',
          code: 'SKU-2',
          description: 'Mesa',
          quantity: 2,
          unitPrice: 250,
        },
        {
          ...order.items[0],
          id: 'line-3',
          productId: 'product-3',
          code: 'SKU-3',
          description: 'Mesa lateral',
          quantity: 1,
          unitPrice: 90,
        },
      ],
    } as Order;
    setupSupabaseFrom([], [
      {
        status: 'fulfilled',
        items: [{ originalOrderItemIndex: 0, returnedQuantity: 1, quantity: 1 }],
      },
    ]);
    render(<ReturnOrderModal order={multiItemOrder} onClose={vi.fn()} onSuccess={vi.fn()} />);

    const returnedItem = await screen.findByRole('button', { name: 'Cadeira' });
    const availableItem = screen.getByRole('button', { name: 'Mesa' });
    expect((returnedItem as HTMLButtonElement).disabled).toBe(true);
    expect((availableItem as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(availableItem);
    fireEvent.click(screen.getByRole('button', { name: 'Coleta da devolução' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cliente devolveu na loja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pedido de devolução' }));

    await waitFor(() => expect(mocks.saveOrder).toHaveBeenCalledTimes(1));
    const created = mocks.saveOrder.mock.calls[0][0] as Order;
    expect(created).toMatchObject({
      orderType: 'return',
      status: 'fulfilled',
      returnMethod: 'store_delivery',
      id: undefined,
      orderIndex: undefined,
      orderNumber: undefined,
      linkedOrderId: 'sale-order',
      linkedOrderCode: expect.any(String),
      returnedTotalAmount: 500,
      originalSoldTotal: 500,
      returnStockProcessed: false,
      returnKind: 'partial',
      customerData: order.customerData,
      seller: order.seller,
      collectionObservation: undefined,
      observation: expect.stringContaining('Devolução vinculada ao pedido #'),
      payments: [],
      paymentsSummary: {
        totalPaymentsFee: 0,
        totalOrderValue: 500,
        totalPaid: 0,
        totalAmountPaid: 0,
        amountRemaining: 500,
      },
      shipping: {
        ...order.shipping,
        deliveryMethod: 'pickup',
        scheduling: {
          date: '',
          time: '',
          startTime: '',
          endTime: '',
          type: 'fixed',
          dateType: 'fixed',
          notInformed: false,
        },
      },
    });
    expect(Number.isNaN(Date.parse(created.date))).toBe(false);
    expect(created.items).toHaveLength(1);
    expect(created.items[0]).toMatchObject({
      productId: 'product-2',
      originalOrderItemIndex: 1,
      returnedQuantity: 2,
      originalUnitPrice: 250,
      originalTotalValue: 500,
      returnedUnitPrice: 250,
      returnedTotalValue: 500,
    });
    expect(created.itemsSummary).toMatchObject({
      totalQuantity: 2,
      itemsSubtotal: 500,
      itemsTotalValue: 500,
      totalFixedDiscount: 0,
      totalItemsCost: 0,
    });
    expect(created.fiscalReturnAllocations).toEqual([]);
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('mantém a coleta agendada na agenda e não transmite antes da confirmação física', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Cadeira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta da devolução' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agendar coleta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pedido de devolução' }));

    await waitFor(() => expect(mocks.saveOrder).toHaveBeenCalledTimes(1));
    const created = mocks.saveOrder.mock.calls[0][0] as Order;
    expect(created).toMatchObject({
      orderType: 'return',
      status: 'scheduled',
      returnMethod: 'store_collection',
      shipping: { scheduling: { date: '2026-10-15', startTime: '10:00' } },
      collectionObservation: '',
    });
    expect(mocks.autoTransmitReturnFiscal).not.toHaveBeenCalled();
  });

  it('inicia a emissão automática após gravar a devolução já recebida na loja', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await screen.findByRole('status');
    fireEvent.click(screen.getByRole('button', { name: 'Cadeira' }));
    fireEvent.click(screen.getByRole('button', { name: 'Coleta da devolução' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cliente devolveu na loja' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gerar pedido de devolução' }));

    await waitFor(() => expect(mocks.saveOrder).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.autoTransmitReturnFiscal).toHaveBeenCalledWith('return-order')
    );
    const created = mocks.saveOrder.mock.calls[0][0] as Order;
    expect(created).toMatchObject({
      orderType: 'return',
      status: 'fulfilled',
      returnMethod: 'store_delivery',
      linkedOrderId: 'sale-order',
      returnKind: 'complete',
      returnedTotalAmount: 100,
      originalSoldTotal: 100,
      returnStockProcessed: false,
      fiscalReturnAllocations: [
        {
          returnItemIndex: 0,
          originalOrderItemIndex: 0,
          originalDocumentId: 'source-nfe',
          originalItemNumber: 1,
          quantity: 1,
        },
      ],
    });
  });

  it('exibe aviso de conferência pendente se a consulta da capacidade fiscal falhar', async () => {
    setupSupabaseFrom([authorizedInvoice]);
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, error: 'Falha temporária de conexão' }),
    });

    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain(
      'Não foi possível confirmar o saldo da NF-e original autorizada'
    );
  });
});
