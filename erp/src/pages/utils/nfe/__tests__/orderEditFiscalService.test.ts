import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('../../supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

describe('serviço de auditoria fiscal da edição de pedido', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'TEST_AUT_token' } },
      error: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia a proposta ao backend e devolve a auditoria vinculada à versão do pedido', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        status: 'confirmation_required',
        orderUpdatedAt: '2026-10-09T10:00:00.000Z',
        changes: [{ field: 'det[1].prod.qCom', expected: '1', actual: '2' }],
        documents: [{ id: 'TEST_AUT_doc', model: '55', environment: 2, changes: [] }],
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { auditFiscalOrderEdit } = await import('../orderEditFiscalService');
    const proposedOrder = { id: 'TEST_AUT_order', items: [{ code: 'SOFA', quantity: 2 }] } as any;
    const audit = await auditFiscalOrderEdit('TEST_AUT_order', proposedOrder);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/nfe/audit-order-edit',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer TEST_AUT_token' }),
        body: JSON.stringify({ orderId: 'TEST_AUT_order', proposedOrder }),
        cache: 'no-store',
      })
    );
    expect(audit).toMatchObject({
      status: 'confirmation_required',
      orderUpdatedAt: '2026-10-09T10:00:00.000Z',
    });
  });

  it('confirma a proposta fiscalmente auditada no servidor antes da transação', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, order: { id: 'TEST_AUT_order' }, replacements: [] })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { confirmFiscalOrderEdit } = await import('../orderEditFiscalService');
    await confirmFiscalOrderEdit({
      requestId: '00000000-0000-4000-8000-000000000001',
      orderId: 'TEST_AUT_order',
      proposedOrder: { id: 'TEST_AUT_order', items: [{ code: 'SOFA', quantity: 2 }] } as any,
      audit: {
        status: 'confirmation_required', orderUpdatedAt: '2026-10-09T10:00:00.000Z',
        changes: [], documents: [{ id: 'TEST_AUT_doc', model: '55', environment: 1, action: 'cancel', changes: [] }],
      },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'confirm',
      requestId: '00000000-0000-4000-8000-000000000001',
      orderId: 'TEST_AUT_order',
      orderUpdatedAt: '2026-10-09T10:00:00.000Z',
      productionConfirmed: true,
      plans: [{ id: 'TEST_AUT_doc', action: 'cancel', environment: 1 }],
    });
  });

  it('vincula a chamada do cancelamento ao registro persistente de substituição', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, status: 'cancelada', protocolNumber: '141260000000001' })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { cancelFiscalDocumentForOrderEdit } = await import('../orderEditFiscalService');
    await cancelFiscalDocumentForOrderEdit({
      documentId: 'TEST_AUT_doc', orderId: 'TEST_AUT_order',
      replacementId: 'TEST_AUT_replacement', environment: 2,
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      documentId: 'TEST_AUT_doc', orderId: 'TEST_AUT_order', replacementId: 'TEST_AUT_replacement',
      viaOrderEdit: true, productionConfirmed: false,
    });
  });

  it('só finaliza a edição vinculada à substituição fiscal confirmada', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, order: { id: 'TEST_AUT_order', status: 'scheduled' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const { finalizeFiscalOrderEdit } = await import('../orderEditFiscalService');
    await finalizeFiscalOrderEdit({ orderId: 'TEST_AUT_order', replacementId: 'TEST_AUT_replacement' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: 'finalize', orderId: 'TEST_AUT_order', replacementId: 'TEST_AUT_replacement',
    });
  });

  it('mantém a substituição pendente quando a resposta da SEFAZ é incerta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ success: false, pending: true, error: 'Consulte a situação fiscal.' }, 202)
      )
    );

    const { cancelFiscalDocumentForOrderEdit } = await import('../orderEditFiscalService');
    await expect(
      cancelFiscalDocumentForOrderEdit({
        documentId: 'TEST_AUT_doc', orderId: 'TEST_AUT_order',
        replacementId: 'TEST_AUT_replacement', environment: 2,
      })
    ).rejects.toThrow('Consulte a situação fiscal.');
  });
});
