// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type Order from '../../../types/order.type';
import ReturnOrderModal from './ReturnOrderModal';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../../../utils/supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('../../../utils/orderHistoryService', () => ({ saveOrder: vi.fn() }));
vi.mock('./ReturnItemsSelection', () => ({ default: () => null }));
vi.mock('./ReturnCollectionSection', () => ({ default: () => null }));
vi.mock('../ReturnFormTabs', () => ({ default: () => null }));

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

describe('aviso fiscal do modal de devolução', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
    fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, hasAuthorizedInvoice: true, lines: [] }),
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

  it('exibe mensagem discreta quando a venda não possui documento fiscal emitido', async () => {
    setupSupabaseFrom([]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain(
      'Esta venda não possui documento fiscal emitido. A devolução será registrada sem emissão de nota fiscal de devolução.'
    );
    expect(notice.textContent).not.toContain('Não foi possível confirmar a NF-e original');
    expect(fetchMock).not.toHaveBeenCalled();
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
  });

  it('explica que gerar a devolução comercial não transmite a NF-e quando existe NF autorizada', async () => {
    setupSupabaseFrom([
      { id: 'doc-1', status: 'autorizada', document_type: 'outbound', modelo: '55', ambiente: 1 },
    ]);
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain(
      'A entrada de estoque só ocorrerá no momento físico correto'
    );
    expect(notice.textContent).toContain('NF-e de devolução será preparada depois');
    expect(notice.textContent).toContain('protocolo da SEFAZ confirma a autorização');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('exibe aviso de conferência pendente se a consulta falhar para venda com NF autorizada', async () => {
    setupSupabaseFrom([
      { id: 'doc-1', status: 'autorizada', document_type: 'outbound', modelo: '55', ambiente: 1 },
    ]);
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
