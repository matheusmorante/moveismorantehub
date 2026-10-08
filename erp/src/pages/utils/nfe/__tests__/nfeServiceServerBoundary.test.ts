import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  print: vi.fn(),
  maybeSingle: vi.fn(),
  from: vi.fn(),
}));

vi.mock('../../supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession }, from: mocks.from },
}));
vi.mock('../danfeGenerator', () => ({ openDanfePrintWindow: mocks.print }));
vi.mock('../../settingsService', () => ({ getSettings: vi.fn().mockResolvedValue({}) }));

describe('emissão NF-e no ERP', () => {
  it.each([1, 2] as const)(
    'reconhece 217 do pipeline comum no ambiente %s sem reenviar',
    async (environment) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          code: 'FISCAL_CONFIRMED_NOT_FOUND',
          state: 'not_found',
          cStat: '217',
          pending: false,
          documentId: 'TEST_AUT_COMMON_DOCUMENT',
          emissionRequestId: 'f19b3e63-6f84-45ea-8c5f-39476d709a3d',
          orderId: 'TEST_AUT_COMMON_ORDER',
          model: '55',
          environment,
          nfeNumber: 102,
          series: '1',
          accessKey: '1'.repeat(44),
        }),
      });
      vi.stubGlobal('fetch', fetchMock);
      const { emitNfeForOrder } = await import('../nfeService');
      const result = await emitNfeForOrder(
        { id: `TEST_AUT_common-${environment}` } as any,
        environment,
        environment === 1
      );
      expect(result).toMatchObject({
        success: false,
        pending: false,
        hmlConfirmedNotFound: true,
        documentId: 'TEST_AUT_COMMON_DOCUMENT',
        nfeNumber: 102,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
        environment,
        productionConfirmed: environment === 1,
      });
    }
  );
  it('preserva o resultado 217 no retry explícito produtivo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        code: 'FISCAL_CONFIRMED_NOT_FOUND',
        state: 'not_found',
        cStat: '217',
        pending: false,
        documentId: 'TEST_AUT_ORIGINAL_DOCUMENT',
        environment: 1,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    expect(
      await emitNfeForOrder(
        { id: 'TEST_AUT_COMMON_RETRY' } as any,
        1,
        true,
        'TEST_AUT_ORIGINAL_DOCUMENT'
      )
    ).toMatchObject({
      success: false,
      pending: false,
      hmlConfirmedNotFound: true,
      documentId: 'TEST_AUT_ORIGINAL_DOCUMENT',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([400, 409, 422, 500, 502, 503])(
    'trata HTTP %s sem repetir o POST ou trocar a intenção',
    async (status) => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({ error: 'TEST_AUT_HTTP_FAILURE' }),
      });
      vi.stubGlobal('fetch', fetchMock);
      const { emitNfeForOrder } = await import('../nfeService');
      const result = await emitNfeForOrder({ id: `TEST_AUT_http-${status}` } as any, 2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result.pending).toBe(status >= 500);
      expect(result.emissionRequestId).toBe(
        JSON.parse(fetchMock.mock.calls[0][1].body).emissionRequestId
      );
    }
  );
  it('mantém tentativa incerta quando a resposta se perde após o envio', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('TEST_AUT_CONNECTION_LOST'));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    const result = await emitNfeForOrder({ id: 'TEST_AUT_lost-response' } as any, 2);
    expect(result).toMatchObject({
      success: false,
      pending: true,
      emissionRequestId: expect.any(String),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('não marca falha comprovadamente anterior à reserva/envio como transmissão incerta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({
          code: 'HML_CERTIFICATE_INVALID',
          numberReserved: false,
          sefazContacted: false,
        }),
      })
    );
    const { emitNfeForOrder } = await import('../nfeService');
    expect((await emitNfeForOrder({ id: 'TEST_AUT_invalid-certificate' } as any, 2)).pending).toBe(
      false
    );
  });
  it('mantém o documento original quando a resposta do retry se perde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('TEST_AUT_CONNECTION_LOST')));
    const { emitNfeForOrder } = await import('../nfeService');
    expect(
      await emitNfeForOrder({ id: 'TEST_AUT_retry-loss' } as any, 2, false, 'original-doc')
    ).toMatchObject({ success: false, pending: true, documentId: 'original-doc' });
  });
  it('dois cliques simultâneos usam a mesma intenção', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 502, json: async () => ({ pending: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    await Promise.all([
      emitNfeForOrder({ id: 'TEST_AUT_double-click' } as any, 2),
      emitNfeForOrder({ id: 'TEST_AUT_double-click' } as any, 2),
    ]);
    const bodies = fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
    expect(bodies[0].emissionRequestId).toBe(bodies[1].emissionRequestId);
  });
  it('vincula a tentativa abandonada ao novo request do mesmo pedido e não transfere o vínculo', async () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
        removeItem: (key: string) => memory.delete(key),
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'TEST_AUT_CONTROLLED' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder, setFiscalEmissionReplacementSource } = await import('../nfeService');
    const order = { id: 'TEST_AUT_hml-replacement-source' } as any;
    const staleRequestId = '4f6d123e-9c93-4c17-9a27-a08c4f909f31';
    memory.set(`nfe-emission-request:${order.id}:outbound:2`, staleRequestId);
    setFiscalEmissionReplacementSource(order.id, 2, 'old-abandoned-document');

    await emitNfeForOrder(order, 2);
    await emitNfeForOrder(order, 2);
    await emitNfeForOrder({ id: 'TEST_AUT_other-order' } as any, 2);

    const requests = fetchMock.mock.calls.map((call) =>
      JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
    );
    expect(requests[0].supersedesDocumentId).toBe('old-abandoned-document');
    expect(requests[0].emissionRequestId).not.toBe(staleRequestId);
    expect(requests[1].supersedesDocumentId).toBe('old-abandoned-document');
    expect(requests[1].emissionRequestId).toBe(requests[0].emissionRequestId);
    expect(requests[2].supersedesDocumentId).toBeUndefined();
  });
  it('não inventa protocolo ou data ao imprimir DANFE incompleto', async () => {
    const { printOrderDanfe } = await import('../nfeService');
    await expect(
      printOrderDanfe({ nfeData: { accessKey: '1'.repeat(44) } } as any)
    ).rejects.toThrow('Dados de autorização incompletos');
    expect(mocks.print).not.toHaveBeenCalled();
  });
  it('não imprime DANFE de pedido sem o XML fiscal original', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const { printOrderDanfe } = await import('../nfeService');

    await expect(
      printOrderDanfe({
        id: 'TEST_AUT_DANFE_ORDER',
        nfeData: {
          accessKey: '1'.repeat(44),
          protocolNumber: '1'.repeat(15),
          protocolDate: '2026-10-01T15:20:30-03:00',
          series: '1',
          nfeNumber: 10,
          model: '55',
          environment: 2,
          status: 'homologada',
        },
      } as any)
    ).rejects.toThrow('XML fiscal original');
    expect(mocks.print).not.toHaveBeenCalled();
  });
  it('resolve documento somente pela intenção, pedido e ambiente originais', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'durable-document' }, error: null });
    const { findFiscalDocumentForRequest } = await import('../nfeService');
    expect(
      await findFiscalDocumentForRequest(
        'TEST_AUT_lookup',
        2,
        'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd'
      )
    ).toBe('durable-document');
    expect(chain.eq.mock.calls).toEqual([
      ['order_id', 'TEST_AUT_lookup'],
      ['ambiente', 2],
      ['emission_request_id', 'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd'],
    ]);
  });
  it('ausência de documento não autoriza uma nova intenção', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
    };
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const { findFiscalDocumentForRequest } = await import('../nfeService');
    await expect(
      findFiscalDocumentForRequest('TEST_AUT_lookup', 2, 'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd')
    ).rejects.toThrow('intenção original foi preservada');
  });
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'operator-token' } },
      error: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it.each(['244', '209'])(
    'uma rejeição %s confirmada permite nova chave de intenção somente no próximo clique',
    async (cStat) => {
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: false,
          pending: false,
          cStat,
          documentId: 'rejected-series',
          xMotivo: 'Série incompatível',
        }),
      }));
      vi.stubGlobal('fetch', fetchMock);
      const { emitNfeForOrder } = await import('../nfeService');
      const order = { id: `TEST_AUT_correction-${cStat}` } as any;
      await emitNfeForOrder(order, 2);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await emitNfeForOrder(order, 2);
      const requests = fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
      );
      expect(requests[1].emissionRequestId).not.toBe(requests[0].emissionRequestId);
    },
    15000
  );
  it.each(['244', '209'])(
    'mantém a intenção pendente, mesmo que a resposta mencione %s',
    async (cStat) => {
      const fetchMock = vi.fn(async () => ({
        ok: false,
        json: async () => ({
          success: false,
          pending: true,
          cStat,
          error: 'Resposta inconclusiva',
        }),
      }));
      vi.stubGlobal('fetch', fetchMock);
      const { emitNfeForOrder } = await import('../nfeService');
      const order = { id: `TEST_AUT_uncertain-${cStat}` } as any;
      await emitNfeForOrder(order, 2);
      await emitNfeForOrder(order, 2);
      const requests = fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
      );
      expect(requests[1].emissionRequestId).toBe(requests[0].emissionRequestId);
    }
  );

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
    const repeated = JSON.parse(
      String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1].body)
    );
    expect(repeated.emissionRequestId).toBe(JSON.parse(String(request.body)).emissionRequestId);
  });

  it('registra o status HTTP e os dados seguros do diagnóstico retornado pelo backend', async () => {
    const diagnosticLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        code: 'HML_SNAPSHOT_RESERVATION_FAILED',
        error: 'Não foi possível reservar snapshot.',
        diagnosticId: '2b705d8e-cb38-4310-86dc-7016e1f875fd',
        diagnosticStage: 'snapshot-reservation',
        databaseCode: '42883',
        diagnosticCategory: 'SQL_FUNCTION_NOT_FOUND',
        diagnosticHint: 'Verifique migration e schema cache.',
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');

    const result = await emitNfeForOrder({ id: 'TEST_AUT_snapshot-diagnostic' } as any, 2);

    expect(result).toMatchObject({
      success: false,
      diagnosticId: '2b705d8e-cb38-4310-86dc-7016e1f875fd',
      databaseCode: '42883',
    });
    expect(diagnosticLog).toHaveBeenCalledWith(
      '[NFe Service] Retorno da API interna de emissão',
      expect.objectContaining({
        endpoint: '/api/nfe/emit',
        httpStatus: 503,
        apiCode: 'HML_SNAPSHOT_RESERVATION_FAILED',
        databaseCode: '42883',
        diagnosticId: '2b705d8e-cb38-4310-86dc-7016e1f875fd',
      })
    );
  });

  it('classifica rejeição SEFAZ pelo cStat quando a resposta não traz código da API', async () => {
    const rejectionLog = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: false,
          pending: false,
          cStat: '391',
          xMotivo: '391: Dados do pagamento com cartão não informados.',
        }),
      })
    );
    const { emitNfeForOrder } = await import('../nfeService');

    const result = await emitNfeForOrder({ id: 'TEST_AUT_sefaz-rejection' } as any, 2);

    expect(result).toMatchObject({
      success: false,
      cStat: '391',
      sefazMessage: '391: Dados do pagamento com cartão não informados.',
    });
    expect(rejectionLog).toHaveBeenCalledWith(
      '[NFe Service] Retorno da API interna de emissão',
      expect.objectContaining({
        httpStatus: 200,
        resultClassification: 'SEFAZ_REJECTION',
        sefazCode: '391',
      })
    );
    expect(rejectionLog.mock.calls[0][1]).not.toHaveProperty('apiCode');
  });

  it('mantém a intenção no conflito ativo e direciona a consulta ao documento existente', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        code: 'HML_SNAPSHOT_RESERVATION_FAILED',
        databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
        databaseCode: '23505',
        documentId: 'active-document',
        model: '65',
        nfeNumber: 611,
        emissionRequestId: '2b0631bb-fa0b-4b20-965a-fcc3dc1cb07d',
        sefazContacted: false,
        numberReserved: false,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    const order = { id: 'TEST_AUT_active-conflict' } as any;
    const result = await emitNfeForOrder(order, 2);
    expect(result).toMatchObject({
      pending: true,
      documentId: 'active-document',
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      model: '65',
      error:
        'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.',
    });
    await emitNfeForOrder(order, 2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).emissionRequestId).toBe(
      '2b0631bb-fa0b-4b20-965a-fcc3dc1cb07d'
    );
  });

  it('preserva a intenção e a reserva após falha anterior ao envio, mesmo com força de nova intenção', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        success: false,
        numberReserved: true,
        sefazContacted: false,
        code: 'HML_XML_INVALID',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    const order = { id: 'TEST_AUT_reserved-pre-send' } as any;
    await emitNfeForOrder(order, 2);
    await emitNfeForOrder(
      order,
      2,
      false,
      undefined,
      undefined,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).emissionRequestId).toBe(
      JSON.parse(fetchMock.mock.calls[0][1].body).emissionRequestId
    );
  });

  it('limpa a chave correta apenas após encerramento explícito e preserva 217 para o retry original', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ success: false, code: 'HML_CONFIRMED_NOT_FOUND', cStat: '217' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder, clearFiscalEmissionRequest } = await import('../nfeService');
    const order = { id: 'TEST_AUT_explicit-clear' } as any;
    await emitNfeForOrder(order, 2);
    await emitNfeForOrder(order, 2);
    const original = JSON.parse(fetchMock.mock.calls[0][1].body).emissionRequestId;
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).emissionRequestId).toBe(original);
    clearFiscalEmissionRequest(order.id, 2);
    await emitNfeForOrder(order, 2);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).emissionRequestId).not.toBe(original);
  });

  it('sends all confirmed item fields and distinguishes explicit CSOSN choices', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'pending' }) }));
    vi.stubGlobal('fetch', fetchMock);
    const { emitNfeForOrder } = await import('../nfeService');
    await emitNfeForOrder(
      {
        id: 'manual-order',
        items: [
          {
            itemType: 'product',
            fiscal: {
              cst: '103',
              csosnSource: 'default',
              ncm: '94036000',
              cfop: '5102',
              origem: '0',
            },
          },
          { itemType: 'service' },
          {
            itemType: 'product',
            fiscal: {
              cst: '102',
              csosnSource: 'manual',
              ncm: '94034000',
              cfop: '5102',
              origem: '2',
              cest: '2804400',
            },
          },
        ],
      } as any,
      2
    );
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

    const result = await emitNfeForOrder({ id: 'order-123' } as any, 1, false, 'nfe-doc-123');

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
