import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  print: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../../supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('../danfeGenerator', () => ({ openDanfePrintWindow: mocks.print }));
vi.mock('../../settingsService', () => ({ getSettings: vi.fn().mockResolvedValue({}) }));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

describe('efeitos fiscais do cancelamento comercial', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'TEST_AUT_token' } },
      error: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('solicita cancelamento SEFAZ quando a política autoriza, independente do ambiente', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          action: 'cancel',
          documentId: 'TEST_AUT_document',
          environment: 2,
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ success: true, cStat: '135', protocolNumber: '141260000000001' })
      );
    vi.stubGlobal('fetch', fetchMock);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    const result = await processOrderCancellationFiscalEffects('TEST_AUT_order', '4268');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/nfe/order-cancellation-policy',
      '/api/nfe/cancel',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      documentId: 'TEST_AUT_document',
      productionConfirmed: true,
      viaOrderCancellation: true,
    });
    expect(result).toMatchObject({ action: 'cancel', cStat: '135' });
  });

  it('prepara rascunho de estorno para revisão quando a política indica estorno', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          action: 'estorno',
          documentId: 'TEST_AUT_document',
          environment: 1,
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, draftId: 'TEST_AUT_draft' }));
    vi.stubGlobal('fetch', fetchMock);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    const result = await processOrderCancellationFiscalEffects('TEST_AUT_order', '4268');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/nfe/order-cancellation-policy',
      '/api/nfe/operation-drafts',
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      kind: 'estorno',
      originalDocumentId: 'TEST_AUT_document',
      environment: 1,
      operationDidNotOccur: true,
      goodsDidNotCirculate: true,
      viaOrderCancellation: true,
    });
    expect(result).toEqual({ action: 'estorno', draftId: 'TEST_AUT_draft' });
  });
});
