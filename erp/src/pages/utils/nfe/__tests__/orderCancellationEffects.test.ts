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
      productionConfirmed: false,
      viaOrderCancellation: true,
    });
    expect(result).toMatchObject({ action: 'cancel', cStat: '135' });
  });

  it('processa cada nota autorizada individualmente e mantém o ID no retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          action: 'batch',
          operations: [
            { action: 'cancel', documentId: 'TEST_AUT_prod', environment: 2, model: '55' },
            { action: 'cancel', documentId: 'TEST_AUT_hml', environment: 2, model: '65' },
          ],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ action: 'cancel', documentId: 'TEST_AUT_prod', environment: 2 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, cStat: '135' }))
      .mockResolvedValueOnce(jsonResponse({ action: 'cancel', documentId: 'TEST_AUT_hml', environment: 2 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, cStat: '135' }));
    vi.stubGlobal('fetch', fetchMock);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    const result = await processOrderCancellationFiscalEffects('TEST_AUT_order', '4268');

    expect(result.action).toBe('batch');
    expect(result.results?.map((item) => [item.documentId, item.action])).toEqual([
      ['TEST_AUT_prod', 'cancel'],
      ['TEST_AUT_hml', 'cancel'],
    ]);
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/nfe/cancel')).toHaveLength(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ documentId: 'TEST_AUT_prod' });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({ documentId: 'TEST_AUT_hml' });
  });

  it('exige confirmação explícita antes de solicitar cancelamento em Produção', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        action: 'cancel',
        documentId: 'TEST_AUT_document',
        environment: 1,
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const confirmProduction = vi.fn(() => false);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    await expect(
      processOrderCancellationFiscalEffects('TEST_AUT_order', '4268', { confirmProduction })
    ).rejects.toThrow('Confirme explicitamente o cancelamento fiscal');

    expect(confirmProduction).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('envia a confirmação de Produção somente após o usuário aceitá-la', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          action: 'cancel',
          documentId: 'TEST_AUT_document',
          environment: 1,
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, cStat: '135' }));
    vi.stubGlobal('fetch', fetchMock);
    const confirmProduction = vi.fn(() => true);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    await processOrderCancellationFiscalEffects('TEST_AUT_order', '4268', { confirmProduction });

    expect(confirmProduction).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({
      productionConfirmed: true,
    });
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

  it('consulta antes e não retransmite quando a política exige reconciliação', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            action: 'reconcile',
            documentId: 'TEST_AUT_document',
            reason: 'Consulte a SEFAZ antes de qualquer nova ação.',
          },
          409
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          state: 'authorized',
          cancellationAttemptState: 'not_registered',
        })
      );
    vi.stubGlobal('fetch', fetchMock);

    const { processOrderCancellationFiscalEffects } = await import('../nfeService');
    const result = await processOrderCancellationFiscalEffects('TEST_AUT_order', '4268');

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/nfe/order-cancellation-policy',
      '/api/nfe/consult',
    ]);
    expect(result).toMatchObject({ action: 'reconcile', reconciliationState: 'authorized' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].body).toBe(JSON.stringify({ documentId: 'TEST_AUT_document' }));
  });
});
