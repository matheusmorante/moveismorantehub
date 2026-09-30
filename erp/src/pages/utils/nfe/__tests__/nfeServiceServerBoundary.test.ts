import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock('../../supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock('../../settingsService', () => ({ getSettings: vi.fn().mockResolvedValue({}) }));

describe('emissão NF-e no ERP', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'operator-token' } },
      error: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('envia ao backend só pedido, ambiente e chave; não reserva número nem monta XML no navegador', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'Matriz fiscal ainda não aprovada.' }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');

    const result = await emitNfeForOrder({ id: 'order-123' } as any, 2);

    expect(result).toMatchObject({
      success: false,
      environment: 2,
      error: 'Matriz fiscal ainda não aprovada.',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/nfe/emit');
    expect(Object.keys(JSON.parse(String(request.body))).sort()).toEqual([
      'emissionRequestId',
      'environment',
      'orderId',
      'productionConfirmed',
    ]);
    expect(JSON.parse(String(request.body)).emissionRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    await emitNfeForOrder({ id: 'order-123' } as any, 2);
    const repeated = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(repeated.emissionRequestId).toBe(JSON.parse(String(request.body)).emissionRequestId);
  });

  it('sends all confirmed item fields and distinguishes explicit CSOSN choices', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'pending' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    await emitNfeForOrder({ id: 'manual-order', items: [
      { itemType: 'product', fiscal: { cst: '103', csosnSource: 'default', ncm: '94036000', cfop: '5102', origem: '0' } },
      { itemType: 'service' },
      { itemType: 'product', fiscal: { cst: '102', csosnSource: 'manual', ncm: '94034000', cfop: '5102', origem: '2', cest: '2804400' } },
    ] } as any, 2);
    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request.body)).itemCsosnOverrides).toEqual({ '2': '102' });
    expect(JSON.parse(String(request.body)).itemFiscalSelections).toEqual({
      '1': { csosn: '103', ncm: '94036000', cfop: '5102', origem: '0', cest: '' },
      '2': { csosn: '102', ncm: '94034000', cfop: '5102', origem: '2', cest: '2804400' },
    });
    expect(String(request.body)).not.toContain('pis');
  });

  it('retransmite usando apenas o ID do documento e devolve a chave fiscal persistida', async () => {
    const storedXml = '<NFe><Signature>assinatura-original</Signature></NFe>';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        documentId: 'nfe-doc-123',
        orderId: 'order-123',
        accessKey: '1'.repeat(44),
        nfeNumber: 701,
        series: '4',
        model: '65',
        environment: 2,
        protocolNumber: '141260000000001',
        protocolDate: '2026-09-30T12:00:00-03:00',
        signedXml: storedXml,
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');

    const result = await emitNfeForOrder(
      { id: 'order-123' } as any,
      1,
      false,
      'nfe-doc-123'
    );

    expect(result).toMatchObject({
      success: true,
      documentId: 'nfe-doc-123',
      orderId: 'order-123',
      accessKey: '1'.repeat(44),
      nfeNumber: 701,
      series: '4',
      model: '65',
      environment: 2,
      xml: storedXml,
      danfeUnavailableReason: expect.stringContaining('XML fiscal original'),
    });
    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toEqual({
      retryDocumentId: 'nfe-doc-123',
      productionConfirmed: false,
    });
  });
});
