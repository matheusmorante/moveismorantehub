// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { WhatsAppMessage } from '../types';
import { getCatalogMessageCaption, getCatalogRetailerIds } from '../catalogInteractiveProducts';
import { CatalogProductCardsBoundary } from '../components/chat/CatalogProductCardsBoundary';
import { InteractiveMessageMedia } from '../components/chat/bubble/media/InteractiveMessageMedia';
import { useInteractiveCatalogProductCards } from '../hooks/useInteractiveCatalogProductCards';
import { extractMessageContent } from '@/pages/utils/customerSupport/whatsappMessageContent';

const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({ in: (column: string, ids: string[]) => mocks.query(table, column, ids) }),
    }),
  },
}));

const variationId = '11111111-1111-4111-8111-111111111111';
const productId = '22222222-2222-4222-8222-222222222222';
const product = {
  id: productId, code: 'BALCAO', name: 'Balcão', status: 'published', active: true,
  deleted: false, deleted_at: null, is_draft: false, unit_price: 1299, price: 1299,
  promo_price: null, stock: 2, images: ['https://images.example/parent.jpg'],
};
const variation = {
  id: variationId, product_id: productId, sku: 'BALCAO-02', name: 'Balcão azul',
  status: 'published', active: true, image_url: 'https://images.example/blue.jpg',
  price: 1299, promo_price: null, stock: 2, attributes: {}, use_parent_price: false,
  products: product,
};

const message = (productPayload: Record<string, unknown>): WhatsAppMessage => ({
  id: 'message-1', conversationId: 'conversation-1', apiMessageId: 'wamid.1',
  direction: 'outbound', messageType: 'interactive', textContent: '🔘 Resposta interativa',
  mediaId: null, mediaMimeType: null, mediaUrl: null, mediaFilename: null, mediaCaption: null,
  replyToMessageId: null, replyToWamid: null, status: 'sent', errorCode: null, failureReason: null,
  timestamp: '2026-11-11T20:45:49Z', createdAt: '2026-11-11T20:45:49Z',
  rawPayload: { source: 'whatsapp_business_app', interactive: { type: 'product', product: productPayload } },
});

function renderMessage(item: WhatsAppMessage) {
  return render(
    <CatalogProductCardsBoundary messages={[item]}>
      {(cards, loading) => <InteractiveMessageMedia message={item} catalogProductCards={cards} loadingCatalogRetailerIds={loading} />}
    </CatalogProductCardsBoundary>
  );
}

beforeEach(() => {
  mocks.query.mockReset();
  mocks.query.mockResolvedValue({ data: [], error: null });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('cards do catálogo na Central', () => {
  it('mostra o produto do eco do WhatsApp e recupera a foto pelo SKU mesmo com uma consulta parcial falhando', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.query.mockImplementation(async (table, column) => {
      if (table === 'products' && column === 'code') return { data: null, error: { message: 'falha' } };
      if (table === 'product_variations' && column === 'sku') return { data: [variation], error: null };
      return { data: [], error: null };
    });
    const item = message({ retailer_id: 'BALCAO-02', title: 'Balcão azul', currency_code: 'BRL', price_amount: 1299000 });
    renderMessage(item);

    expect(screen.queryByText('🔘 Resposta interativa')).toBeNull();
    expect(screen.getByText(/1\.299,00/)).toBeTruthy();
    const image = await screen.findByRole('img', { name: 'Balcão azul' });
    expect(image.getAttribute('src')).toBe('https://images.example/blue.jpg');
    expect(mocks.query).toHaveBeenCalledWith('product_variations', 'sku', ['BALCAO-02']);
  });

  it('recupera a variação pelo link quando o eco não contém SKU', async () => {
    mocks.query.mockImplementation(async (table, column) => ({
      data: table === 'product_variations' && column === 'id' ? [variation] : [], error: null,
    }));
    const item = message({
      title: 'Balcão azul', currency_code: 'BRL', price_amount: 1299000,
      url: `https://moveismorante.com.br/produto/balcao?var=${variationId}`,
    });
    expect(getCatalogRetailerIds(item)).toEqual([`variation:${variationId}`]);
    renderMessage(item);

    const image = await screen.findByRole('img', { name: 'Balcão azul' });
    expect(image.getAttribute('src')).toBe('https://images.example/blue.jpg');
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).toHaveBeenCalledWith('product_variations', 'id', [variationId]);
  });

  it('usa a variação do link quando o SKU da mensagem não existe mais', async () => {
    mocks.query.mockImplementation(async (table, column) => ({
      data: table === 'product_variations' && column === 'id' ? [variation] : [], error: null,
    }));
    const item = message({
      retailer_id: 'SKU-LEGADO', title: 'Balcão azul', currency_code: 'BRL', price_amount: 1299000,
      url: `https://moveismorante.com.br/produto/balcao?var=${variationId}`,
    });
    renderMessage(item);

    const image = await screen.findByRole('img', { name: 'Balcão azul' });
    expect(image.getAttribute('src')).toBe('https://images.example/blue.jpg');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(mocks.query).toHaveBeenCalledWith('product_variations', 'id', [variationId]);
  });

  it('exibe os dados da mensagem quando ela não traz identificador ou link', async () => {
    renderMessage(message({ title: 'Produto antigo', currency_code: 'BRL', price_amount: 80000, sale_price_amount: 70000 }));

    expect(screen.getByText('Produto antigo')).toBeTruthy();
    expect(screen.getByText(/70,00/)).toBeTruthy();
    expect(screen.getByText('Valor na mensagem')).toBeTruthy();
    await waitFor(() => expect(mocks.query).not.toHaveBeenCalled());
  });

  it('consulta todos os produtos carregados em lotes de até 120 identificadores', async () => {
    const messages = Array.from({ length: 121 }, (_, index) => ({
      ...message({ retailer_id: `SKU${index}`, title: `Produto ${index}` }), id: `message-${index}`,
    }));
    const { result } = renderHook(() => useInteractiveCatalogProductCards(messages));

    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(4));
    await waitFor(() => expect(result.current.loadingRetailerIds.size).toBe(0));
    const skuBatches = mocks.query.mock.calls.filter(([table, column]) => table === 'product_variations' && column === 'sku');
    expect(skuBatches.map(([, , ids]) => ids.length)).toEqual([120, 1]);
    expect(new Set(skuBatches.flatMap(([, , ids]) => ids)).size).toBe(121);
  });

  it('identifica o produto no histórico e preserva respostas normais de botão', () => {
    const interactive = { type: 'product', product: { retailer_id: 'BALCAO-02', title: 'Balcão azul' } };
    const extracted = extractMessageContent({ type: 'interactive', interactive });
    expect(extracted.text).toBe('🛍️ Produto do catálogo: Balcão azul');
    expect(extracted.rawPayload?.interactive).toEqual(interactive);
    expect(getCatalogMessageCaption({ ...message(interactive.product), textContent: extracted.text })).toBe('');
    expect(extractMessageContent({ type: 'interactive', interactive: { type: 'button_reply', button_reply: { id: 'yes', title: 'Sim' } } }).text)
      .toBe('🔘 Sim\nIdentificador: yes');
  });
});
