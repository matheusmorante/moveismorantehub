// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
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
  items: [{ id: 'line-1', productId: 'product-1', code: 'SKU-1', description: 'Cadeira', quantity: 1, unitPrice: 100 }],
  itemsSummary: { totalQuantity: 1 },
  shipping: { value: 0, deliveryMethod: 'delivery', orderType: 'standard', scheduling: { date: '', time: '', type: 'fixed' } },
  seller: 'Teste',
  payments: [],
  paymentsSummary: { totalOrderValue: 100 },
  customerData: { fullName: 'Cliente sintético' },
  observation: '',
  date: '2026-10-01T12:00:00Z',
} as unknown as Order;

describe('aviso fiscal do modal de devolução', () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null });
    const query: any = {};
    query.select = vi.fn(() => query);
    query.eq = vi.fn(() => query);
    query.or = vi.fn(async () => ({ data: [], error: null }));
    mocks.from.mockReturnValue(query);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, hasAuthorizedInvoice: true, lines: [] }),
    })));
  });

  it('explica que gerar a devolução comercial não transmite a NF-e', async () => {
    render(<ReturnOrderModal order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const notice = await screen.findByRole('status');

    expect(notice.textContent).toContain('A entrada de estoque só ocorrerá no momento físico correto');
    expect(notice.textContent).toContain('NF-e de devolução será preparada depois');
    expect(notice.textContent).toContain('protocolo da SEFAZ confirma a autorização');
  });
});
