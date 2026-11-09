import { expect, it, vi } from 'vitest';

export function registerNfeServiceServerBoundaryPreparationRecoveryCases(mocks: {
  from: any;
  maybeSingle: any;
}): void {
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
    ).rejects.toMatchObject({ code: 'FISCAL_REQUEST_DOCUMENT_NOT_FOUND' });
  });
  it('reconcilia a preparação ausente sem chamar SEFAZ', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
    };
    const fetchMock = vi.fn();
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    vi.stubGlobal('fetch', fetchMock);
    const { consultSefazStatus } = await import(
      '@/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeReconciliationService'
    );

    const outcome = await consultSefazStatus('TEST_AUT_lookup', 2, {
      success: false,
      pending: true,
      orderId: 'TEST_AUT_lookup',
      environment: 2,
      emissionRequestId: 'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd',
      sefazContacted: false,
      technicalDetails: { apiCode: 'FISCAL_PREPARATION_UNCONFIRMED' },
    });

    expect(outcome).toMatchObject({
      state: 'not_found',
      updatedResult: {
        pending: false,
        preparationReconciled: true,
        sefazContacted: false,
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('encerra como falha pré-transmissão quando a preparação inválida não deixou documento', async () => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: mocks.maybeSingle,
    };
    const fetchMock = vi.fn();
    mocks.from.mockReturnValue(chain);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    vi.stubGlobal('fetch', fetchMock);
    const { consultSefazStatus } = await import(
      '@/pages/App/SalesOrder/OrderActions/nfe-modal/services/nfeReconciliationService'
    );

    const outcome = await consultSefazStatus('TEST_AUT_lookup', 1, {
      success: false,
      pending: true,
      orderId: 'TEST_AUT_lookup',
      environment: 1,
      emissionRequestId: 'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd',
      numberReserved: false,
      sefazContacted: false,
      technicalDetails: { apiCode: 'FISCAL_PREPARATION_INVALID' },
    });

    expect(outcome).toMatchObject({
      state: 'error',
      updatedResult: {
        pending: false,
        numberReserved: false,
        sefazContacted: false,
      },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('reusa o ID explícito ao retomar uma preparação não confirmada', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        pending: true,
        code: 'FISCAL_PREPARATION_UNCONFIRMED',
        numberReserved: false,
        sefazContacted: false,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { clearFiscalEmissionRequest, emitNfeForOrder } = await import('../nfeService');
    const order = { id: 'TEST_AUT_preparation-recovery' } as any;
    const request = (existingEmissionRequestId?: string) =>
      emitNfeForOrder(
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
        false,
        undefined,
        undefined,
        existingEmissionRequestId ? { existingEmissionRequestId } : {}
      );

    try {
      const initial = await request();
      const resumed = await request(initial.emissionRequestId);
      const requestBodies = fetchMock.mock.calls.map((call) =>
        JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
      );

      expect(initial).toMatchObject({ success: false, pending: true, sefazContacted: false });
      expect(resumed.emissionRequestId).toBe(initial.emissionRequestId);
      expect(requestBodies[1].emissionRequestId).toBe(requestBodies[0].emissionRequestId);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      clearFiscalEmissionRequest(order.id, 2);
      errorSpy.mockRestore();
    }
  });
}
