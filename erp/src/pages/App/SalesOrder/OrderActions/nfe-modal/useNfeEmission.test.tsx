// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
import { fetchOrderFiscalBadgeStatuses } from '@/pages/utils/nfe/orderFiscalBadgeService';
import { NfeEmissionModal } from '../NfeEmissionModal';
import PostOrderActionsModal from '../PostOrderActionsModal';
import { NfeEnvironmentChoiceModal } from './NfeEnvironmentChoiceModal';
import { useNfeItemEnrichment } from './hooks/useNfeItemEnrichment';
import { clearFiscalEmissionDrafts, useNfeEmission } from './useNfeEmission';

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  emit: vi.fn(),
  toast: vi.fn(),
  nextNumber: vi.fn(),
  getFullProduct: vi.fn(),
  getProductsFiscalData: vi.fn(),
  getSession: vi.fn(),
  findDocument: vi.fn(),
  abandonAttempt: vi.fn(),
  setReplacementSource: vi.fn(),
  buildFiscalChoices: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'administrator' } }),
}));
vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({
  prepareHmlItemCsosns: mocks.prepare,
}));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  emitNfeForOrder: mocks.emit,
  findFiscalDocumentForRequest: mocks.findDocument,
  getNextNfeNumberPreview: mocks.nextNumber,
  getCachedFiscalNumberPreview: vi.fn(() => null),
  updateFiscalNumberPreviewCache: vi.fn(),
  clearFiscalEmissionRequest: vi.fn(),
  abandonUntransmittedHmlAttempt: mocks.abandonAttempt,
  setFiscalEmissionReplacementSource: mocks.setReplacementSource,
  buildFiscalItemSelectionPayload: mocks.buildFiscalChoices,
  printOrderDanfe: vi.fn(),
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ fiscalDefaults: { cst: '103' } }),
}));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.getFullProduct }));
vi.mock('@/pages/utils/productService/productFiscalDataService', () => ({
  getProductsFiscalData: mocks.getProductsFiscalData,
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock('@/pages/utils/nfe/orderFiscalBadgeService', () => ({
  fetchOrderFiscalBadgeStatuses: vi.fn().mockResolvedValue({}),
}));
vi.mock('./NcmSelect', () => ({
  NcmSelect: ({
    id,
    hasError,
    value,
    onChange,
  }: {
    id?: string;
    hasError?: boolean;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      id={id}
      data-has-error={hasError ? 'true' : undefined}
      aria-label="NCM"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock('react-toastify', () => ({
  toast: { error: mocks.toast, success: vi.fn(), warning: vi.fn() },
}));
describe('preenchimento dos itens da NF-e', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    clearFiscalEmissionDrafts();
    mocks.nextNumber.mockResolvedValue(102);
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'synthetic-test-token' } },
      error: null,
    });
    mocks.abandonAttempt.mockResolvedValue({ success: true, alreadyAbandoned: false });
    mocks.buildFiscalChoices.mockReturnValue({
      itemCsosnOverrides: {},
      itemFiscalSelections: {
        '1': { ncm: '94035000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
      },
    });
    mocks.prepare.mockResolvedValue([
      { itemNumber: 1, csosn: '103', source: 'default' },
      { itemNumber: 2, csosn: '103', source: 'default' },
    ]);
    mocks.getProductsFiscalData.mockImplementation(async (productIds: string[]) =>
      new Map(
        productIds.map((id) => [id, { id, ncm: '94036000', cfop: '5102', origem: '0' }])
      )
    );
    vi.mocked(fetchOrderFiscalBadgeStatuses).mockResolvedValue({});
  });
  const order: any = {
    id: 'synthetic-order',
    shipping: { deliveryMethod: 'pickup' },
    customerData: { cpfCnpj: '12345678909' },
    items: [
      {
        quantity: 1,
        description: 'ITEM A',
        fiscal: { ncm: '94036000', cfop: '5102', origem: '2' },
      },
      { quantity: 1, description: 'ITEM B', fiscal: { cst: '500', ncm: '94036000', origem: '0' } },
    ],
  };
  it('bloqueia a transmissão e identifica o item ausente da consulta fiscal em lote', async () => {
    const productIds = Array.from(
      { length: 10 },
      (_, index) => `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`
    );
    const items = productIds.map((productId, index) => ({
      ...order.items[0],
      orderItemId: `TEST_AUT_item-${index + 1}`,
      productId,
      description: `TEST_AUT_ITEM_${index + 1}`,
    }));
    const missingItemNumber = 7;
    mocks.getProductsFiscalData.mockResolvedValue(
      new Map(
        productIds
          .filter((_, index) => index + 1 !== missingItemNumber)
          .map((id) => [id, { id, ncm: '94036000', cfop: '5102', origem: '0' }])
      )
    );

    render(
      <NfeEmissionModal
        isOpen
        order={{ ...order, items } as any}
        initialEnvironment={1}
        onClose={vi.fn()}
      />
    );

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.stringContaining(`item(ns): ${missingItemNumber}`)
      )
    );
    expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.getProductsFiscalData).toHaveBeenCalledWith(productIds, { useCache: false });
    expect(mocks.getProductsFiscalData).toHaveBeenCalledTimes(1);
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('inicia a consulta fiscal em lote em paralelo com a preparação de CSOSN', async () => {
    const productId = '00000000-0000-4000-8000-000000000001';
    let resolveProductData!: (data: Map<string, any>) => void;
    let resolveCsosns!: (items: any[]) => void;
    mocks.getProductsFiscalData.mockReturnValue(
      new Promise((resolve) => {
        resolveProductData = resolve;
      })
    );
    mocks.prepare.mockReturnValue(
      new Promise((resolve) => {
        resolveCsosns = resolve;
      })
    );
    const batchOrder = {
      ...order,
      id: 'TEST_AUT_parallel',
      items: [{ ...order.items[0], productId }],
    } as any;
    const manualFiscalFields = { current: new Map() };

    const { result } = renderHook(() =>
      useNfeItemEnrichment({
        order: batchOrder,
        environment: 2,
        manualFiscalFields,
      })
    );

    await waitFor(() => {
      expect(mocks.getProductsFiscalData).toHaveBeenCalledWith([productId], { useCache: false });
      expect(mocks.prepare).toHaveBeenCalledWith('TEST_AUT_parallel');
    });
    expect(result.current.isLoadingFiscalData).toBe(true);

    await act(async () => {
      resolveProductData(new Map([[productId, { id: productId }]]));
      resolveCsosns([{ itemNumber: 1, csosn: '103', source: 'default', cfop: '5102' }]);
    });

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.fiscalPreparationError).toBeNull();
  });

  it('localiza a intenção com resposta perdida e consulta sem outra emissão', async () => {
    mocks.emit.mockResolvedValue({
      success: false,
      pending: true,
      emissionRequestId: 'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd',
      environment: 2,
    });
    mocks.findDocument.mockResolvedValue('durable-document');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        pending: false,
        state: 'not_found',
        code: 'HML_CONFIRMED_NOT_FOUND',
        cStat: '217',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => {
      await result.current.handleEmit();
    });
    await act(async () => {
      await result.current.handleReconcile();
    });
    expect(mocks.findDocument).toHaveBeenCalledWith(
      order.id,
      2,
      'aa1146c0-ea67-47aa-9ec6-8af7e5907dcd'
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ documentId: 'durable-document' });
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(result.current.emissionResult).toMatchObject({
      pending: false,
      hmlConfirmedNotFound: true,
      documentId: 'durable-document',
    });
  });
  it('preserva a tentativa TLS, depois da ação explícita inicia uma nova emissão vinculada', async () => {
    const requestId = 'd81628e1-7874-42cf-9ae2-fcfd551903e3';
    mocks.emit
      .mockResolvedValueOnce({
        success: false,
        pending: false,
        emissionRequestId: requestId,
        documentId: 'hml-document-616',
        orderId: order.id,
        environment: 2,
        model: '65',
        nfeNumber: 616,
        hmlCanAbandonTlsFailure: true,
        fiscalMismatchFields: [
          {
            field: 'Item 1 · NCM',
            snapshotValue: '94036000',
            currentValue: '94035000',
          },
        ],
        technicalDetails: {
          apiCode: 'HML_IDEMPOTENCY_MISMATCH',
          httpStatus: 409,
          diagnosticStage: 'snapshot-comparison',
        },
        error:
          'A tentativa fiscal existente não pode ser reutilizada porque os dados fiscais foram alterados após a criação do snapshot.',
      })
      .mockResolvedValueOnce({ success: false, pending: true, documentId: 'hml-document-new' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const mismatch = await screen.findByTestId('nfe-fiscal-mismatch-fields');
    expect(mismatch.textContent).toContain('Item 1 · NCM');
    expect(mismatch.textContent).toContain('Antes: 94036000 · Agora: 94035000');
    expect(screen.getByTestId('fiscal-issue-card').className).toContain('border-amber-300');
    const technicalDetails = screen.getByTestId('fiscal-technical-details') as HTMLDetailsElement;
    expect(technicalDetails.open).toBe(false);
    const issueCard = screen.getByTestId('fiscal-issue-card');
    const userFacingText = [...issueCard.childNodes]
      .filter((node) => node !== technicalDetails)
      .map((node) => node.textContent || '')
      .join(' ');
    expect(userFacingText).not.toMatch(/HML_IDEMPOTENCY_MISMATCH|\b409\b/);
    expect(technicalDetails.querySelector('dd')?.textContent).toBe('HML_IDEMPOTENCY_MISMATCH');
    fireEvent.click(screen.getByText('Ver detalhes técnicos'));
    expect(screen.getByText('HML_IDEMPOTENCY_MISMATCH')).toBeTruthy();
    expect(screen.getByText('409')).toBeTruthy();

    fireEvent.click(screen.getByTestId('nfe-start-fresh-hml-emission'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(2));
    expect(mocks.abandonAttempt).toHaveBeenCalledWith(order.id, 'hml-document-616', requestId, {
      itemCsosnOverrides: {},
      itemFiscalSelections: {
        '1': { ncm: '94035000', cfop: '5102', origem: '2', cest: '', csosn: '103' },
      },
    });
    expect(mocks.setReplacementSource).toHaveBeenCalledWith(order.id, 2, 'hml-document-616');
    expect(mocks.emit.mock.calls[1][15]).toBe(true);
  });

  it('mostra o campo CSOSN real que mudou e mantém os dois valores legíveis', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: false,
      environment: 2,
      model: '65',
      documentId: 'hml-document-csosn',
      emissionRequestId: 'hml-request-csosn',
      hmlCanAbandonTlsFailure: true,
      fiscalMismatchFields: [
        {
          field: 'Item 1 · CSOSN',
          snapshotValue: '103',
          currentValue: '500',
        },
      ],
      technicalDetails: { apiCode: 'HML_IDEMPOTENCY_MISMATCH' },
      error: 'A tentativa existente contém dados fiscais anteriores.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    const mismatch = await screen.findByTestId('nfe-fiscal-mismatch-fields');
    expect(mismatch.textContent).toContain('Item 1 · CSOSN');
    expect(mismatch.textContent).toContain('Antes: 103 · Agora: 500');
    expect(screen.getByText('Os dados fiscais deste pedido mudaram')).toBeTruthy();
  });

  it('traduz a rejeição de NCM e mantém o código técnico recolhido', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: false,
      environment: 2,
      model: '65',
      documentId: 'hml-document-rejected',
      cStat: '778',
      sefazMessage: '778: Informado NCM inexistente [nItem: 1]',
      technicalDetails: { apiCode: 'HML_SEFAZ_REJECTED', httpStatus: 422, sefazCode: '778' },
      error: 'A SEFAZ rejeitou a nota.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(await screen.findByText('Não foi possível autorizar a nota')).toBeTruthy();
    expect(screen.getByText(/O NCM informado para um dos produtos não existe/)).toBeTruthy();
    expect((screen.getByTestId('fiscal-technical-details') as HTMLDetailsElement).open).toBe(false);
    expect(screen.queryByRole('button', { name: 'Consultar SEFAZ agora' })).toBeNull();
  });

  it('mantém transmissão incerta bloqueada e oferece apenas consultar a SEFAZ', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: true,
      environment: 2,
      model: '65',
      documentId: 'hml-document-uncertain',
      emissionRequestId: 'hml-request-uncertain',
      technicalDetails: {
        apiCode: 'HML_TRANSMISSION_UNCERTAIN',
        httpStatus: 502,
        transportCode: 'SELF_SIGNED_CERT_IN_CHAIN',
        diagnosticStage: 'sefaz-transmission',
        diagnosticId: 'diagnostic-uncertain',
      },
      error: 'A resposta da emissão não foi confirmada.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(
      await screen.findByText('Estamos confirmando o que aconteceu com esta nota')
    ).toBeTruthy();
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    expect(screen.queryByTestId('nfe-start-fresh-hml-emission')).toBeNull();
    expect(screen.queryByTestId('nfe-retry-same-document')).toBeNull();
    expect(screen.getByRole('button', { name: 'Consultar SEFAZ agora' })).toBeTruthy();
    expect(screen.getByTestId('fiscal-issue-card').querySelector('h2')?.textContent).not.toContain(
      'HML_TRANSMISSION_UNCERTAIN'
    );
  });

  it('fecha o modal de emissão ao receber a NFC-e em homologação e entrega o resultado ao chamador', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: true,
      documentId: 'fiscal-document-615',
      environment: 2,
      model: '65',
      nfeNumber: 615,
      series: '1',
      protocolNumber: 'synthetic-protocol',
      accessKey: '41261000000000000000650010000006151000006150',
      xml: '<NFe />',
    });
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<NfeEmissionModal isOpen order={order} onClose={onClose} onSuccess={onSuccess} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      documentId: 'fiscal-document-615',
      model: '65',
      environment: 2,
    }));
    expect(screen.queryByText('Nota recebida em homologação · sem valor fiscal')).toBeNull();
  });

  it('mostra o número da nota em campo numérico e permite edição manual', async () => {
    mocks.nextNumber.mockResolvedValue(112);
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    const preview = (await screen.findByRole('spinbutton', {
      name: 'Número da nota',
    })) as HTMLInputElement;
    await waitFor(() => expect(preview.value).toBe('112'));
    expect(preview.type).toBe('number');
    expect(preview.min).toBe('1');
    expect(preview.max).toBe('999999999');
    expect(preview.step).toBe('1');
    expect(screen.getByText('Número da nota')).toBeTruthy();
    expect(screen.queryByText('Número da nota (prévia)')).toBeNull();
    expect(preview.readOnly).toBe(false);
    expect(screen.getByTestId('nfe-number-preview-context').textContent).toBe(
      'Série 1 · Homologação'
    );
    expect(mocks.nextNumber).toHaveBeenCalledWith('65', DEFAULT_NFE_ENVIRONMENT, '1', 600);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][4]).toBeUndefined();
    expect(mocks.emit.mock.calls[0][15]).toBe(false);
  });

  it('mantém a reserva automática se a consulta da prévia falhar', async () => {
    mocks.nextNumber.mockRejectedValue(new Error('preview unavailable'));
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    expect(await screen.findByText(/Prévia indisponível/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][4]).toBeUndefined();
  });

  it('permite retransmitir a mesma NFC-e depois da reconciliação 217 confirmada', async () => {
    mocks.emit
      .mockResolvedValueOnce({
        success: false,
        pending: true,
        documentId: 'hml-document-609',
        environment: 2,
        model: '65',
        nfeNumber: 609,
        error: 'Transmissão sem resposta confirmada.',
      })
      .mockResolvedValueOnce({
        success: false,
        pending: true,
        documentId: 'hml-document-609',
        error: 'HML_RETRY_CONTROLLED',
      });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          code: 'HML_CONFIRMED_NOT_FOUND',
          state: 'not_found',
          pending: false,
          documentId: 'hml-document-609',
          xMotivo: '217: NF-e não encontrada.',
        }),
      })
    );

    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    fireEvent.click(await screen.findByRole('button', { name: /Consultar SEFAZ agora/i }));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const retrySameDocument = await screen.findByRole('button', {
      name: 'Retransmitir a mesma NFC-e',
    });
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    expect(screen.getByTestId('fiscal-issue-card').className).toContain('border-blue-300');

    fireEvent.click(retrySameDocument);
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(2));
    expect(mocks.emit.mock.calls[1][3]).toBe('hml-document-609');
    expect(mocks.emit.mock.calls[1][15]).toBe(false);
  });

  it('consulta 217 com XML vencido exige clique explícito e nova reserva automática', async () => {
    mocks.emit
      .mockResolvedValueOnce({
        success: false,
        pending: true,
        documentId: 'hml-old',
        environment: 2,
        model: '65',
        nfeNumber: 614,
        error: 'Transmissão incerta.',
      })
      .mockResolvedValueOnce({ success: false, pending: true, documentId: 'hml-new' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          pending: false,
          state: 'not_found',
          cStat: '217',
          code: 'HML_NEW_EMISSION_REQUIRED',
          safeNewEmission: true,
          error: 'XML vencido; é necessária uma nova emissão.',
        }),
      })
    );
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    const number = await screen.findByRole('spinbutton', { name: 'Número da nota' });
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.change(number, { target: { value: '615' } });
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByRole('button', { name: /Consultar SEFAZ agora/i }));
    const fresh = await screen.findByTestId('nfe-start-fresh-hml-emission');
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Retransmitir a mesma NFC-e' })).toBeNull();
    fireEvent.click(fresh);
    fireEvent.click(fresh);
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(2));
    expect(mocks.emit.mock.calls[1][3]).toBeUndefined();
    expect(mocks.emit.mock.calls[1][4]).toBeUndefined();
  });

  it('retoma o 217 retornado pela emissão com o número original, mesmo após edição manual', async () => {
    mocks.nextNumber.mockResolvedValue(614);
    mocks.emit
      .mockResolvedValueOnce({
        success: false,
        pending: false,
        hmlConfirmedNotFound: true,
        documentId: 'hml-document-613',
        environment: 2,
        model: '65',
        nfeNumber: 613,
        series: '1',
        cStat: '217',
        error: 'NF-e não consta na SEFAZ.',
      })
      .mockResolvedValueOnce({ success: false, pending: true, documentId: 'hml-document-613' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    const number = await screen.findByRole('spinbutton', { name: 'Número da nota' });
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.change(number, { target: { value: '615' } });
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const retry = await screen.findByRole('button', { name: 'Retransmitir a mesma NFC-e' });
    expect((number as HTMLInputElement).value).toBe('613');
    expect((number as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    fireEvent.click(retry);
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(2));
    expect(mocks.emit.mock.calls[1][3]).toBe('hml-document-613');
    expect(mocks.emit.mock.calls[1][4]).toBeUndefined();
  });

  it('duplo clique e conflito ativo mantêm uma emissão e oferecem consulta sem nova transmissão', async () => {
    let resolveEmission!: (result: unknown) => void;
    mocks.emit.mockReturnValue(
      new Promise((resolve) => {
        resolveEmission = resolve;
      })
    );
    const onSuccess = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        state: 'authorized',
        protocolNumber: 'synthetic-protocol',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} onSuccess={onSuccess} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    const emit = screen.getByTestId('nfe-emit-button');
    fireEvent.click(emit);
    fireEvent.click(emit);
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolveEmission({
        success: false,
        pending: true,
        databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
        documentId: 'existing-hml-document',
        model: '65',
        nfeNumber: 611,
        error:
          'Já existe uma tentativa fiscal em andamento para este pedido. Consulte o status antes de emitir novamente.',
      })
    );
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    expect(screen.getByTestId('fiscal-issue-card').className).toContain('border-amber-300');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Consultar tentativa em andamento' })
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      documentId: 'existing-hml-document',
    });
    expect(mocks.emit).toHaveBeenCalledTimes(1);
  });

  it('retoma uma reserva sem documento pelo fluxo de emissão original', async () => {
    mocks.emit
      .mockResolvedValueOnce({
        success: false,
        pending: true,
        databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
        reservationRecoveryRequired: true,
        error: 'Retome a reserva existente.',
      })
      .mockResolvedValueOnce({ success: false, error: 'TEST_AUT_RESUMED' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    fireEvent.click(await screen.findByRole('button', { name: 'Retomar reserva existente' }));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(2));
    expect(mocks.emit.mock.calls[1][3]).toBeUndefined();
    expect(mocks.emit.mock.calls[1][15]).toBe(false);
  });

  it('consulta inconclusiva mantém a emissão bloqueada e rejeição persistida libera correção', async () => {
    mocks.emit.mockResolvedValue({
      success: false,
      pending: true,
      documentId: 'existing-attempt',
      databaseReason: 'ALREADY_ACTIVE_FISCAL_ATTEMPT',
      error: 'Tentativa em andamento.',
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          pending: true,
          code: 'HML_RECONCILIATION_REQUIRED',
          error: 'Consulta indisponível',
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          pending: false,
          code: 'HML_SEFAZ_REJECTED',
          cStat: '753',
          error: 'Rejeição persistida da emissão',
        }),
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const consult = await screen.findByRole('button', { name: 'Consultar tentativa em andamento' });
    fireEvent.click(consult);
    expect(
      await screen.findByText('Estamos confirmando o que aconteceu com esta nota')
    ).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    fireEvent.click(consult);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const rejectionCard = screen.getByTestId('fiscal-issue-card');
    expect(rejectionCard.textContent).toContain('Não foi possível autorizar a nota');
    expect(rejectionCard.className).toContain('border-rose-300');
    const rejectionDetails = rejectionCard.querySelector('details') as HTMLDetailsElement;
    expect(rejectionDetails.open).toBe(false);
    const rejectionText = [...rejectionCard.childNodes]
      .filter((node) => node !== rejectionDetails)
      .map((node) => node.textContent || '')
      .join(' ');
    expect(rejectionText).not.toMatch(/HML_SEFAZ_REJECTED|\b753\b/);
    expect(rejectionDetails.textContent).toContain('HML_SEFAZ_REJECTED');
    expect(rejectionDetails.textContent).toContain('753');
  });

  it('mostra somente consulta para uma transmissão incerta', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: true,
      environment: 2,
      model: '65',
      documentId: 'hml-document-uncertain',
      emissionRequestId: 'hml-request-uncertain',
      technicalDetails: {
        apiCode: 'HML_TRANSMISSION_UNCERTAIN',
        httpStatus: 502,
        transportCode: 'SELF_SIGNED_CERT_IN_CHAIN',
        diagnosticStage: 'sefaz-transmission',
        diagnosticId: 'diagnostic-uncertain',
      },
      error: 'A resposta da emissão não foi confirmada.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    expect(
      await screen.findByText('Estamos confirmando o que aconteceu com esta nota')
    ).toBeTruthy();
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    expect(screen.queryByTestId('nfe-start-fresh-hml-emission')).toBeNull();
    expect(screen.queryByTestId('nfe-retry-same-document')).toBeNull();
    expect(screen.getByRole('button', { name: 'Consultar SEFAZ agora' })).toBeTruthy();
    expect(screen.getByTestId('fiscal-issue-card').querySelector('h2')?.textContent).not.toContain(
      'HML_TRANSMISSION_UNCERTAIN'
    );
  });

  it('mostra CSOSN e valores anterior/atual sem inventar outro campo', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: false,
      environment: 2,
      model: '65',
      documentId: 'hml-document-csosn',
      emissionRequestId: 'hml-request-csosn',
      hmlCanAbandonTlsFailure: true,
      fiscalMismatchFields: [
        {
          field: 'Item 1 · CSOSN',
          snapshotValue: '103',
          currentValue: '500',
        },
      ],
      technicalDetails: { apiCode: 'HML_IDEMPOTENCY_MISMATCH' },
      error: 'A tentativa existente contém dados fiscais anteriores.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    const mismatch = await screen.findByTestId('nfe-fiscal-mismatch-fields');
    expect(mismatch.textContent).toContain('Item 1 · CSOSN');
    expect(mismatch.textContent).toContain('Antes: 103 · Agora: 500');
    expect(mismatch.textContent).not.toContain('NCM');
  });

  it('traduz rejeição de NCM sem mostrar o código na mensagem principal', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: false,
      environment: 2,
      model: '65',
      documentId: 'hml-document-rejected-ncm',
      cStat: '778',
      sefazMessage: '778: Informado NCM inexistente [nItem: 1]',
      technicalDetails: { apiCode: 'HML_SEFAZ_REJECTED', httpStatus: 422, sefazCode: '778' },
      error: 'A SEFAZ rejeitou a nota.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    const card = await screen.findByTestId('fiscal-issue-card');
    expect(await screen.findByText('Não foi possível autorizar a nota')).toBeTruthy();
    expect(card.textContent).toContain('O NCM informado para um dos produtos não existe');
    const details = card.querySelector('details') as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(
      [...card.childNodes]
        .filter((node) => node !== details)
        .map((node) => node.textContent)
        .join(' ')
    ).not.toMatch(/HML_SEFAZ_REJECTED|\b778\b|HTTP 422/);
  });

  it('mostra toast para rejeição SEFAZ retornada sem código de erro da API', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: false,
      pending: false,
      environment: 2,
      model: '65',
      cStat: '391',
      sefazMessage: '391: Dados do pagamento com cartão não informados.',
      technicalDetails: { httpStatus: 200, sefazCode: '391' },
      error: 'Dados do pagamento com cartão não informados.',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(await screen.findByText('Não foi possível autorizar a nota')).toBeTruthy();
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.stringContaining('Dados do pagamento com cartão não informados')
      )
    );
    expect(mocks.toast.mock.calls[0][0]).not.toContain('UNKNOWN');
  });

  it('não renderiza o card de sucesso fiscal na tela de emissão', async () => {
    mocks.emit.mockResolvedValueOnce({
      success: true,
      documentId: 'fiscal-document-615',
      environment: 2,
      model: '65',
      nfeNumber: 615,
      series: '1',
      protocolNumber: 'synthetic-protocol',
      accessKey: '41261000000000000000650010000006151000006150',
      xml: '<NFe />',
    });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Nota recebida em homologação · sem valor fiscal')).toBeNull();
  });

  it('mostra carregamento não bloqueante e deixa CPF opcional na NFC-e comum', async () => {
    let resolveProduct!: (product: unknown) => void;
    mocks.getProductsFiscalData.mockReturnValue(
      new Promise((resolve) => {
        resolveProduct = resolve;
      })
    );
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const pickupOrder = {
      ...order,
      id: 'synthetic-nfce-without-tax-id',
      customerData: { fullName: 'Cliente', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 100 },
      items: [{ ...order.items[0], productId: 'registered-product' }],
    } as any;

    render(<NfeEmissionModal isOpen order={pickupOrder} onClose={vi.fn()} />);
    expect(screen.getByText('Carregando dados do cliente e dos produtos…')).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(true);
    await waitFor(() =>
      expect(mocks.getProductsFiscalData).toHaveBeenCalledWith(['registered-product'], {
        useCache: false,
      })
    );

    await act(async () =>
      resolveProduct(
        new Map([
          [
            'registered-product',
            { id: 'registered-product', ncm: '94036000', cfop: '5102', origem: '0' },
          ],
        ])
      )
    );

    await waitFor(() =>
      expect(screen.queryByText('Carregando dados do cliente e dos produtos…')).toBeNull()
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Informações do Cliente' }));
    expect(screen.getByLabelText('CPF')).toBeTruthy();
    expect(
      screen.getByText('Documento opcional nesta NFC-e; se informado, será validado.')
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][6]).toBe('');
  });

  it.each([undefined, '94036000'])(
    'autopreenche o campo do modal com o NCM cadastrado quando o pedido contém %s',
    async (savedNcm) => {
      const registeredOrder: any = {
        ...order,
        id: `catalog-ncm-${savedNcm || 'empty'}`,
        items: [{ ...order.items[0], productId: 'registered-product', fiscal: { ncm: savedNcm } }],
      };
      const original = structuredClone(registeredOrder);
      mocks.getProductsFiscalData.mockResolvedValue(
        new Map([['registered-product', { id: 'registered-product', ncm: '94035000' }]])
      );
      render(<NfeEmissionModal isOpen order={registeredOrder} onClose={vi.fn()} />);
      await waitFor(() =>
        expect((screen.getByRole('textbox', { name: 'NCM' }) as HTMLInputElement).value).toBe(
          '94035000'
        )
      );
      expect(mocks.getProductsFiscalData).toHaveBeenCalledWith(['registered-product'], {
        useCache: false,
      });
      expect(registeredOrder).toEqual(original);
    }
  );

  it('herda o NCM do produto quando a variação cadastrada não tem NCM próprio', async () => {
    mocks.getProductsFiscalData.mockResolvedValue(
      new Map([
        [
          'registered-product',
          {
            id: 'registered-product',
            ncm: '94035000',
            variations: { 'variation-without-ncm': {} },
          },
        ],
      ])
    );
    const registeredOrder: any = {
      ...order,
      id: 'catalog-ncm-variation',
      items: [
        {
          ...order.items[0],
          productId: 'registered-product',
          variationId: 'variation-without-ncm',
        },
      ],
    };
    const { result } = renderHook(() => useNfeEmission(registeredOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94035000');
  });

  it('preserva o NCM do pedido quando o cadastro não fornece um código', async () => {
    mocks.getProductsFiscalData.mockResolvedValue(
      new Map([['registered-product', { id: 'registered-product', ncm: '' }]])
    );
    const registeredOrder: any = {
      ...order,
      id: 'catalog-ncm-fallback',
      items: [{ ...order.items[0], productId: 'registered-product' }],
    };
    const { result } = renderHook(() => useNfeEmission(registeredOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94036000');
  });

  it('mantém a edição manual do NCM cadastrado ao reabrir e enviar o modal', async () => {
    mocks.getProductsFiscalData.mockResolvedValue(
      new Map([['registered-product', { id: 'registered-product', ncm: '94035000' }]])
    );
    const registeredOrder: any = {
      ...order,
      id: 'catalog-ncm-manual-draft',
      items: [{ ...order.items[0], productId: 'registered-product' }],
    };
    const original = structuredClone(registeredOrder);
    const first = renderHook(() => useNfeEmission(registeredOrder));
    await waitFor(() => expect(first.result.current.isLoadingFiscalData).toBe(false));
    act(() => first.result.current.handleUpdateItemFiscal(0, { ncm: '94034000' }));
    first.unmount();
    const reopened = renderHook(() => useNfeEmission(registeredOrder));
    await waitFor(() => expect(reopened.result.current.isLoadingFiscalData).toBe(false));
    expect(reopened.result.current.nfeItems[0].fiscal.ncm).toBe('94034000');
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    await act(async () => reopened.result.current.handleEmit());
    expect(mocks.emit.mock.calls[0][0].items[0].fiscal.ncm).toBe('94034000');
    expect(registeredOrder).toEqual(original);
  });

  it('usa 103 para item de teste e o CSOSN atual do produto cadastrado', async () => {
    const testOrder = {
      ...order,
      id: 'hml-test-order-csosn',
      items: [
        { ...order.items[0], fiscal: { ...order.items[0].fiscal, cst: '102' } },
        { ...order.items[1], productId: 'registered-product' },
      ],
    };
    mocks.prepare.mockResolvedValue([
      { itemNumber: 1, csosn: '103', source: 'default' },
      { itemNumber: 2, csosn: '500', source: 'catalog' },
    ]);
    mocks.getProductsFiscalData.mockResolvedValue(
      new Map([['registered-product', { id: 'registered-product', cst: '500' }]])
    );
    const { result } = renderHook(() => useNfeEmission(testOrder));
    await waitFor(() =>
      expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['103', '500'])
    );
    expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['103', '500']);
    expect(result.current.nfeItems[0].fiscal).toMatchObject({
      ncm: '94036000',
      cfop: '5102',
      origem: '2',
    });
    act(() => result.current.handleUpdateItemFiscal(0, { cst: '102' }));
    expect(result.current.nfeItems[0].fiscal).toMatchObject({ cst: '102', csosnSource: 'manual' });
  });
  it('mantém os itens visíveis e bloqueia a emissão se a preparação fiscal falhar', async () => {
    mocks.prepare.mockRejectedValue(new Error('Configuração indisponível'));
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems.map((item) => item.description)).toEqual(['ITEM A', 'ITEM B']);
    expect(result.current.fiscalPreparationError).toBe('Configuração indisponível');
    await act(async () => result.current.handleEmit());
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Configuração indisponível');
  });
  it('escolhe finalidade da compra e mostra a razão do modelo sem alterar o pedido', async () => {
    const original = structuredClone(order);
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    expect(screen.getByText(/NFC-e · modelo 65/)).toBeTruthy();
    const purpose = screen.getByLabelText('Finalidade da compra');
    expect(purpose.className).toContain('border-0');
    expect(purpose.className).toContain('border-b-2');
    expect(purpose.className).toContain('focus:border-blue-600');
    expect(screen.getByRole('option', { name: 'Uso / consumo próprio' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Revenda' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /^(Sim|Não)/ })).toBeNull();
    expect(screen.queryByLabelText('Entrega própria da loja')).toBeNull();
    expect(screen.queryByLabelText('Cartão em terminal separado')).toBeNull();
    fireEvent.change(purpose, { target: { value: 'resale' } });
    expect(screen.getByText(/NF-e · modelo 55 necessária/)).toBeTruthy();
    expect(screen.getByText(/Mercadoria destinada à revenda/)).toBeTruthy();
    expect(order).toEqual(original);
  });

  it('bloqueia NF-e 55 sem CPF/CNPJ antes de chamar a emissão', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-missing-tax-id',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'SP' } },
      customerData: { fullName: 'Cliente' },
    };
    const { result } = renderHook(() => useNfeEmission(deliveryOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    expect(result.current.recipientTaxIdError).toBe(
      'A NF-e modelo 55 desta venda doméstica exige CPF/CNPJ do destinatário.'
    );
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'A NF-e modelo 55 desta venda doméstica exige CPF/CNPJ do destinatário.'
    );
  });

  it('permite emitir NFC-e modelo 65 de retirada abaixo de R$ 10.000 sem exigir CPF ou CNPJ', async () => {
    const nfcePickupOrder: any = {
      ...order,
      id: 'nfce-pickup-without-tax-id',
      shipping: { deliveryMethod: 'pickup' },
      customerData: { fullName: 'Consumidor', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 4500 },
      fiscalContext: { finalConsumer: true, presence: '4' },
    };
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={nfcePickupOrder} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Informações do Cliente' }));
    expect(screen.getByLabelText('CPF')).toBeTruthy();
    expect(screen.getByText('Identificação não exigida')).toBeTruthy();
    expect(
      screen.getByText('Documento opcional nesta NFC-e; se informado, será validado.')
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][6]).toBe('');
  });

  it('exige CPF/CNPJ para NFC-e não presencial, mesmo abaixo de R$ 10.000', async () => {
    const nfceDeliveryOrder: any = {
      ...order,
      id: 'nfce-delivery-without-tax-id',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'PR' } },
      customerData: { fullName: 'Consumidor', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 4500 },
      fiscalContext: { finalConsumer: true },
    };
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={nfceDeliveryOrder} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Informações do Cliente' }));
    expect(
      screen.getByText(
        'Como este pedido será entregue no endereço do cliente, o CPF do destinatário é obrigatório para a NFC-e.'
      )
    ).toBeTruthy();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    expect(
      await screen.findByText(
        'Como este pedido será entregue no endereço do cliente, o CPF do destinatário é obrigatório para a NFC-e.'
      )
    ).toBeTruthy();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('bloqueia NFC-e modelo 65 a partir de R$ 10.000 quando não há CPF/CNPJ', async () => {
    const highValueNfceOrder: any = {
      ...order,
      id: 'nfce-high-value-without-tax-id',
      shipping: { deliveryMethod: 'pickup' },
      customerData: { fullName: 'Consumidor', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 12000 },
      fiscalContext: { finalConsumer: true },
    };
    render(<NfeEmissionModal isOpen order={highValueNfceOrder} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    const field = await screen.findByLabelText(/CPF/);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(
      await screen.findByText(
        'Esta NFC-e tem valor igual ou superior a R$ 10.000; informe o CPF do destinatário.'
      )
    ).toBeTruthy();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('destaca o campo de destinatário no modal e mantém a emissão parada para NF-e 55', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-missing-tax-id-ui',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'SP' } },
      customerData: { fullName: 'Cliente' },
    };
    render(<NfeEmissionModal isOpen order={deliveryOrder} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    const field = await screen.findByLabelText(/CPF/);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.getAttribute('aria-describedby')).toBe('nfe-recipient-tax-id-error');
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('usa o CPF válido digitado apenas para esta emissão sem gravá-lo no pedido', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-temporary-tax-id',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'PR' } },
      customerData: { fullName: 'Cliente', personType: 'PF' },
    };
    const original = structuredClone(deliveryOrder);
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const { result } = renderHook(() => useNfeEmission(deliveryOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.setRecipientTaxId('123.456.789-09'));
    await act(async () => result.current.handleEmit());
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(mocks.emit.mock.calls[0][6]).toBe('123.456.789-09');
    expect(deliveryOrder).toEqual(original);
  });

  it('mantém todos os campos após fechar/desmontar e reabrir o modal, sem alterar pedido', async () => {
    const original = structuredClone(order);
    const changes = { ncm: '94034000', cfop: '5101', origem: '2', cest: '2804400', cst: '102' };
    const reopenOrder = { ...order, id: 'reopen-order' };
    const first = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() => expect(first.result.current.nfeItems[0]?.fiscal.cst).toBe('103'));
    act(() => first.result.current.handleUpdateItemFiscal(0, changes));
    first.unmount();
    const reopened = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() =>
      expect(reopened.result.current.nfeItems[0]?.fiscal.csosnSource).toBe('manual')
    );
    expect(reopened.result.current.nfeItems[0].fiscal).toMatchObject({
      ...changes,
      csosnSource: 'manual',
    });
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    await act(async () => reopened.result.current.handleEmit());
    expect(mocks.emit.mock.calls[0][0].items[0].fiscal).toMatchObject(changes);
    expect(order).toEqual(original);
  });

  it('exibe no modal produtos cadastrados, usados, salvados e avulsos sem cadastro', async () => {
    mocks.prepare.mockResolvedValue([
      { itemNumber: 1, csosn: '103', source: 'default' },
      { itemNumber: 2, csosn: '103', source: 'default' },
      { itemNumber: 3, csosn: '103', source: 'default' },
      { itemNumber: 4, csosn: '103', source: 'default' },
    ]);
    const orderWithAllOrigins: any = {
      ...order,
      id: 'all-stock-origins-order',
      items: [
        {
          ...order.items[0],
          orderItemId: 'new-stock',
          productId: 'product-new',
          itemType: 'product',
          condition: 'novo',
          description: 'Produto de estoque novo',
        },
        {
          ...order.items[0],
          orderItemId: 'used-stock',
          productId: undefined,
          variationId: undefined,
          isTemporaryProduct: true,
          itemType: 'product',
          condition: 'usado',
          description: 'Produto usado sem vínculo de estoque',
        },
        {
          ...order.items[0],
          orderItemId: 'salvaged-stock',
          productId: undefined,
          variationId: undefined,
          isTemporaryProduct: true,
          itemType: 'product',
          condition: 'salvado',
          description: 'Produto salvado sem vínculo de estoque',
        },
        {
          ...order.items[0],
          orderItemId: 'unregistered',
          productId: undefined,
          variationId: undefined,
          isTemporaryProduct: true,
          itemType: 'product',
          description: 'Item avulso não cadastrado',
        },
        {
          ...order.items[0],
          orderItemId: 'service',
          itemType: 'service',
          description: 'Serviço de montagem',
        },
      ],
    };

    render(<PostOrderActionsModal order={orderWithAllOrigins} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Emitir nota fiscal de saída' }));

    // No novo fluxo, o clique abre primeiramente a escolha de ambiente
    expect(await screen.findByRole('dialog', { name: 'Emitir nota fiscal de saída' })).toBeTruthy();
    // Clica em Homologação para abrir o formulário de emissão
    fireEvent.click(screen.getByRole('button', { name: /Homologação/i }));

    fireEvent.click(await screen.findByRole('tab', { name: 'Itens' }));
    for (const description of [
      'Produto de estoque novo',
      'Produto usado sem vínculo de estoque',
      'Produto salvado sem vínculo de estoque',
      'Item avulso não cadastrado',
    ]) {
      expect(await screen.findByText(description)).toBeTruthy();
    }
    await waitFor(() => expect(screen.queryByText(/Carregando NCMs e dados fiscais/)).toBeNull());
    expect(screen.getByText('4 produto(s) • 3 não cadastrado(s) no ERP')).toBeTruthy();
    expect(screen.queryByText('Serviço de montagem')).toBeNull();
  });

  it('mantém as linhas na tela quando a API fiscal está indisponível e desabilita a emissão', async () => {
    mocks.prepare.mockRejectedValue(new Error('Configuração indisponível'));
    const orderWithUnregisteredItem: any = {
      ...order,
      items: [
        {
          ...order.items[0],
          productId: undefined,
          isTemporaryProduct: true,
          description: 'Item avulso para conferência',
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderWithUnregisteredItem} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));

    expect(await screen.findByText('Item avulso para conferência')).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(true);
  });

  it('informa exatamente o campo NCM faltante com toast específico, alterna para a aba de itens e destaca o campo', async () => {
    const orderMissingNcm: any = {
      ...order,
      id: 'missing-ncm-order',
      items: [
        {
          quantity: 1,
          description: 'CADEIRA GAMER',
          fiscal: { ncm: '', cfop: '5102', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderMissingNcm} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );

    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    expect(mocks.toast).toHaveBeenCalledWith('Informe o NCM do produto "CADEIRA GAMER".');
    expect(mocks.emit).not.toHaveBeenCalled();

    // Deve alternar para a aba de Itens e renderizar o elemento de erro
    await waitFor(() => {
      const ncmInput = document.getElementById('nfe-item-ncm-0');
      expect(ncmInput).toBeTruthy();
      expect(ncmInput?.getAttribute('data-has-error')).toBe('true');
    });
  });

  it('informa exatamente quando o NCM não possui 8 dígitos', async () => {
    const orderInvalidNcm: any = {
      ...order,
      id: 'invalid-ncm-length',
      items: [
        {
          quantity: 1,
          description: 'MESA OFFICE',
          fiscal: { ncm: '9403', cfop: '5102', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderInvalidNcm} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );

    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    expect(mocks.toast).toHaveBeenCalledWith(
      'NCM do produto "MESA OFFICE" deve conter exatamente 8 dígitos.'
    );
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('informa exatamente o CFOP faltante, abre a sanfona do item e destaca o campo com erro', async () => {
    const orderMissingCfop: any = {
      ...order,
      id: 'missing-cfop-order',
      items: [
        {
          quantity: 1,
          description: 'ESTANTE DE LIVROS',
          fiscal: { ncm: '94036000', cfop: '', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderMissingCfop} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );

    // Na interface, o usuário limpa o CFOP do item
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    // Abre a sanfona de campos fiscais
    const expandButtons = screen.getAllByTitle('Ver / editar CFOP, CSOSN, Origem e CEST');
    fireEvent.click(expandButtons[0]);
    const cfopSelect = document.getElementById('nfe-item-cfop-0') as HTMLSelectElement;
    fireEvent.change(cfopSelect, { target: { value: '' } });

    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    expect(mocks.toast).toHaveBeenCalledWith('Selecione o CFOP do produto "ESTANTE DE LIVROS".');
    expect(mocks.emit).not.toHaveBeenCalled();

    await waitFor(() => {
      const cfopSelect = document.getElementById('nfe-item-cfop-0');
      expect(cfopSelect).toBeTruthy();
      expect(cfopSelect?.className).toContain('border-rose-500');
    });
  });

  it('exibe o CSOSN 103 por padrão e permite edição manual', async () => {
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    const expandButtons = screen.getAllByTitle('Ver / editar CFOP, CSOSN, Origem e CEST');
    fireEvent.click(expandButtons[0]);

    const csosnSelect = document.getElementById('nfe-item-csosn-0') as HTMLSelectElement;
    expect(csosnSelect).toBeTruthy();
    expect(csosnSelect.value).toBe('103');
    expect(csosnSelect.disabled).toBe(false);
    fireEvent.change(csosnSelect, { target: { value: '102' } });
    expect(csosnSelect.value).toBe('102');
  });

  it('desativa a opção de homologação com tooltip no modal prévio quando já emitida em homologação', async () => {
    const orderHmlIssued: any = {
      ...order,
      id: 'hml-issued-order',
      nfeData: {
        status: 'homologada',
        environment: 2,
        accessKey: '41260400000000000000550010000000011000000010',
      },
    };

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderHmlIssued}
        onClose={vi.fn()}
        onSelectEnvironment={vi.fn()}
      />
    );

    const hmlButton = screen.getByText('Homologação').closest('button');
    expect(hmlButton?.hasAttribute('disabled')).toBe(true);
    expect(hmlButton?.getAttribute('title')).toBe(
      'Nota fiscal de homologação já emitida para este pedido.'
    );
  });

  it('mantém a opção de produção desativada por segurança no modal prévio', async () => {
    const orderForTest: any = {
      ...order,
      id: 'prod-test-order',
      nfeData: null,
    };

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderForTest}
        onClose={vi.fn()}
        onSelectEnvironment={vi.fn()}
      />
    );

    const prodButton = screen.getByText('Produção').closest('button');
    expect(prodButton?.hasAttribute('disabled')).toBe(true);
    expect(prodButton?.getAttribute('title')).toBe(
      'Emissão em produção desativada temporariamente por segurança.'
    );
  });

  it('no modal de formulário, não exibe os botões de seleção de ambiente no cabeçalho e inicializa com o ambiente escolhido', async () => {
    render(<NfeEmissionModal isOpen order={order} initialEnvironment={2} onClose={vi.fn()} />);

    // O cabeçalho não deve mais conter os seletores radio de ambiente
    expect(screen.queryByRole('radiogroup', { name: 'Ambiente de emissão' })).toBeNull();
    // Exibe a tag de identificação do ambiente no cabeçalho
    expect(screen.getByText('Homologação')).toBeTruthy();
  });

  it('desativa o botão de emitir nota fiscal de saída nas ações pós-venda com tooltip informativo quando já emitida', async () => {
    const orderWithNfe: any = {
      ...order,
      id: 'post-order-nfe-issued',
      nfeData: {
        status: 'autorizada',
        accessKey: '41260400000000000000550010000000031000000030',
      },
    };

    render(<PostOrderActionsModal order={orderWithNfe} onClose={vi.fn()} />);

    const issueNfeButton = screen.getByText('Emitir nota fiscal de saída').closest('button');
    expect(issueNfeButton).toBeTruthy();
    expect(issueNfeButton?.hasAttribute('disabled')).toBe(true);
    expect(issueNfeButton?.getAttribute('title')).toBe('Nota fiscal já emitida para este pedido.');
    expect(issueNfeButton?.className).toContain('cursor-not-allowed');
  });

  it('nas ações pós-venda, ao clicar em emitir nota fiscal abre primeiramente a escolha de ambiente', async () => {
    const freshOrder: any = {
      ...order,
      id: 'fresh-post-order',
      nfeData: null,
    };

    render(<PostOrderActionsModal order={freshOrder} onClose={vi.fn()} />);

    const issueNfeButton = screen.getByText('Emitir nota fiscal de saída');
    fireEvent.click(issueNfeButton);

    expect(screen.getByText('Selecione o ambiente fiscal', { exact: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Homologação/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Produção/i })).toBeTruthy();
  });

  it('não re-executa a busca e enriquecimento de produtos quando apenas os dados do cliente mudam', async () => {
    mocks.getProductsFiscalData.mockClear();

    const registeredOrder: any = {
      ...order,
      id: 'stable-deps-order',
      items: [{ ...order.items[0], productId: 'stable-prod-1' }],
      customerData: { ...order.customerData, personType: 'PF' },
    };

    const { result, rerender } = renderHook(
      ({ orderProp }) => useNfeEmission(orderProp),
      { initialProps: { orderProp: registeredOrder } }
    );

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    const initialCallCount = mocks.getProductsFiscalData.mock.calls.length;
    expect(initialCallCount).toBeGreaterThanOrEqual(1);

    // Re-render simulando atualização de dados do cliente (ex: personType alterado de PF para PJ)
    rerender({
      orderProp: {
        ...registeredOrder,
        customerData: {
          ...registeredOrder.customerData,
          personType: 'PJ',
          fullName: 'Novo Nome do Cliente',
        },
      },
    });

    // O contador de chamadas de produto DEVE PERMANECER IDÊNTICO (não pode re-executar busca de produto!)
    expect(mocks.getProductsFiscalData.mock.calls.length).toBe(initialCallCount);
    expect(result.current.isLoadingFiscalData).toBe(false);
  });
});
