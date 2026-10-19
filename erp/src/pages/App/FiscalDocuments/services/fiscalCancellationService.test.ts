import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  maybeSingle: vi.fn(),
  updateOrder: vi.fn(),
  processCancellation: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: mocks.maybeSingle,
    })),
  },
}));
vi.mock('@/pages/utils/orderMutationService', () => ({ updateOrder: mocks.updateOrder }));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  processOrderCancellationFiscalEffects: mocks.processCancellation,
}));

import { executeFiscalCancellation } from './fiscalCancellationService';
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('executeFiscalCancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: 'sale-1',
        status: 'scheduled',
        order_type: 'sale',
        order_index: 1045,
        order_data: { id: 'sale-1', status: 'scheduled', orderType: 'sale', items: [] },
      },
      error: null,
    });
    mocks.updateOrder.mockResolvedValue(undefined);
    mocks.processCancellation.mockResolvedValue({ action: 'cancel', cStat: '135' });
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'test-token' } }, error: null });
  });

  it('cancela comercialmente o pedido uma vez e aplica o tratamento fiscal somente à nota selecionada', async () => {
    const selectedDocument = {
      id: 'document-selected',
      order_id: 'sale-1',
      numero_nfe: 1045,
      modelo: '55',
      ambiente: 2,
    } as any;

    const result = await executeFiscalCancellation({
      document: selectedDocument,
      reason: 'Cancelamento solicitado dentro do prazo legal',
      isCancelEvent: true,
      productionConfirmed: false,
    });

    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrder).toHaveBeenCalledWith(
      'sale-1',
      { status: 'cancelled' },
      expect.objectContaining({ id: 'sale-1', orderIndex: 1045 })
    );
    expect(mocks.processCancellation).toHaveBeenCalledTimes(1);
    expect(mocks.processCancellation).toHaveBeenCalledWith(
      'sale-1',
      '1045',
      expect.objectContaining({
        reason: 'Cancelamento solicitado dentro do prazo legal',
        productionConfirmed: false,
        documentId: 'document-selected',
      })
    );
    expect(result).toMatchObject({ action: 'cancel', cStat: '135', commercialCommitted: true });
  });

  it('não altera novamente a venda já cancelada e ainda endereça só o documento solicitado', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({
      data: {
        id: 'sale-1',
        status: 'cancelled',
        order_type: 'sale',
        order_index: 1045,
        order_data: { id: 'sale-1', status: 'cancelled', orderType: 'sale', items: [] },
      },
      error: null,
    });

    await executeFiscalCancellation({
      document: { id: 'document-second', order_id: 'sale-1', numero_nfe: 1045 } as any,
      reason: 'Cancelamento solicitado dentro do prazo legal',
      isCancelEvent: true,
      productionConfirmed: false,
    });

    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.processCancellation).toHaveBeenCalledWith(
      'sale-1',
      '1045',
      expect.objectContaining({ documentId: 'document-second' })
    );
  });

  const operation = (type = 'return') => ({ id: 'operation-doc', order_id: 'original-sale', numero_nfe: 713,
    modelo: '55', ambiente: 2, document_type: type }) as any;
  const input = (doc = operation()) => ({ document: doc, reason: '  Conferência do cancelamento fiscal da nota selecionada.  ',
    isCancelEvent: true, productionConfirmed: false });
  it.each(['return', 'estorno'])('cancela somente o documento %s, sem ler/alterar pedido ou estoque', async type => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, cStat: '135', protocolNumber: '141260000000001' }), { headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await executeFiscalCancellation(input({ ...operation(type), order_id: null }));
    expect(result).toMatchObject({ action: 'cancel', commercialCommitted: false, cStat: '135' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/nfe/cancel');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ documentId: 'operation-doc',
      reason: 'Conferência do cancelamento fiscal da nota selecionada.', productionConfirmed: false });
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
    expect(mocks.updateOrder).not.toHaveBeenCalled();
    expect(mocks.processCancellation).not.toHaveBeenCalled();
  });
  it.each(['network', 'pending', 'html', 'missing-proof', 'null'])('preserva o estado comercial e exige consulta diante de resultado %s', async mode => {
    const fetchMock = vi.fn();
    if (mode === 'network') fetchMock.mockRejectedValue(new Error('connection lost'));
    else fetchMock.mockResolvedValue(new Response(mode === 'html' ? '<html>proxy</html>' : JSON.stringify(mode === 'null' ? null : mode === 'missing-proof' ? { success: true, cStat: '135' } : { success: false, pending: true }), { headers: { 'Content-Type': mode === 'html' ? 'text/html' : 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await executeFiscalCancellation(input())).toMatchObject({ action: 'reconcile', commercialCommitted: false, reconciliationRequired: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });
  it('bloqueia produção sem confirmação antes de ler sessão ou enviar evento', async () => {
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(executeFiscalCancellation(input({ ...operation(), ambiente: 1 }))).rejects.toThrow('Confirme explicitamente');
    expect(mocks.getSession).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it('mantém rejeição conhecida visível sem mutação comercial', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Vínculo fiscal inválido.' }), { status: 409, headers: { 'Content-Type': 'application/json' } })));
    await expect(executeFiscalCancellation(input())).rejects.toThrow('Vínculo fiscal inválido.');
    expect(mocks.updateOrder).not.toHaveBeenCalled();
  });
});
