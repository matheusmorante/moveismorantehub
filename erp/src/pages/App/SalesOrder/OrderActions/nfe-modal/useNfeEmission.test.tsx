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
import { useNfeItemEnrichment } from './hooks/useNfeItemEnrichment';
import { NfeEnvironmentChoiceModal } from './NfeEnvironmentChoiceModal';
import { clearFiscalEmissionDrafts, useNfeEmission } from './useNfeEmission';

const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  emit: vi.fn(),
  preview: vi.fn(),
  toast: vi.fn(),
  nextNumber: vi.fn(),
  getFullProduct: vi.fn(),
  getProductsFiscalData: vi.fn(),
  getSession: vi.fn(),
  findDocument: vi.fn(),
  abandonAttempt: vi.fn(),
  clearRequest: vi.fn(),
  setReplacementSource: vi.fn(),
  buildFiscalChoices: vi.fn(),
  updateOrder: vi.fn(),
  fetchOrderById: vi.fn(),
  persistedOrders: new Map<string, any>(),
  prepareOrderSnapshot: vi.fn(),
  profileRole: 'administrator' as string,
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    profile: { role: mocks.profileRole },
    isRealAdministrator: mocks.profileRole === 'administrator',
    activeRoleMode: null,
  }),
}));
vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({
  prepareHmlItemCsosns: mocks.prepare,
}));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  emitNfeForOrder: (...args: any[]) => {
    const options = args[args.length - 1];
    return options?.previewOnly ? mocks.preview(...args) : mocks.emit(...args);
  },
  findFiscalDocumentForRequest: mocks.findDocument,
  getNextNfeNumberPreview: mocks.nextNumber,
  getCachedFiscalNumberPreview: vi.fn(() => null),
  updateFiscalNumberPreviewCache: vi.fn(),
  clearFiscalEmissionRequest: mocks.clearRequest,
  abandonUntransmittedHmlAttempt: mocks.abandonAttempt,
  setFiscalEmissionReplacementSource: mocks.setReplacementSource,
  buildFiscalItemSelectionPayload: mocks.buildFiscalChoices,
  printOrderDanfe: vi.fn(),
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ companyUF: 'PR', companyCRT: '1', fiscalDefaults: { cst: '103' } }),
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
vi.mock('@/pages/utils/nfeEmissionSnapshotService', () => ({
  prepareOrderFiscalSnapshotForEmission: mocks.prepareOrderSnapshot,
}));
vi.mock('@/pages/utils/orderHistoryService', () => ({
  updateOrder: async (...args: any[]) => {
    const [id, changes, source] = args;
    const known = mocks.persistedOrders.get(id) || source || { id, items: [] };
    const previous = { ...known, updatedAt: known.updatedAt || '2026-10-01T00:00:00Z' };
    if (!mocks.persistedOrders.has(id)) mocks.persistedOrders.set(id, previous);
    await mocks.updateOrder(...args);
    mocks.persistedOrders.set(id, { ...previous, ...changes, id, updatedAt: new Date(Date.parse(previous.updatedAt || '2026-10-01T00:00:00Z') + 1000).toISOString() });
  },
  fetchOrderById: mocks.fetchOrderById,
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
  toast: { error: mocks.toast, success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));
describe('preenchimento dos itens da NF-e', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    clearFiscalEmissionDrafts();
    mocks.profileRole = 'administrator';
    mocks.prepareOrderSnapshot.mockImplementation(async (currentOrder: any) => currentOrder);
    mocks.preview.mockResolvedValue({
      success: true,
      preview: true,
      environment: 2,
      model: '55',
      nfeNumber: 102,
      series: '1',
      accessKey: '4'.repeat(44),
      xml: '<NFe><infNFe><ide><tpAmb>2</tpAmb></ide></infNFe></NFe>',
      previewProof: {
        fingerprint: 'a'.repeat(64),
        capturedAt: '2026-10-09T12:00:00.000Z',
        issuedAt: '2026-10-09T12:00:00.000Z',
        model: '55',
        series: '1',
        number: 102,
        accessKey: '4'.repeat(44),
      },
    });
    mocks.nextNumber.mockResolvedValue(102);
    mocks.updateOrder.mockResolvedValue(undefined);
    mocks.persistedOrders.clear();
    mocks.fetchOrderById.mockImplementation(async (id: string) => structuredClone(mocks.persistedOrders.get(id) || null));
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
    mocks.getProductsFiscalData.mockImplementation(
      async (productIds: string[]) =>
        new Map(productIds.map((id) => [id, { id, ncm: '94036000', cfop: '5102', origem: '0' }]))
    );
    vi.mocked(fetchOrderFiscalBadgeStatuses).mockResolvedValue({});
  });

  async function requestXmlPreview(): Promise<void> {
    const button = screen.getByTestId('nfe-emit-button') as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    await act(async () => { fireEvent.click(button); });
  }

  async function prepareNfeEmission(): Promise<void> {
    await waitFor(() =>
      expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false)
    );
  }
  const order: any = {
    id: 'synthetic-order',
    fiscalContext: { finalConsumer: false },
    shipping: { deliveryMethod: 'pickup' },
    customerData: { cpfCnpj: '12345678909', ieIndicator: '1', ie: '1234567890' },
    items: [
      {
        quantity: 1,
        description: 'ITEM A',
        fiscalSnapshotVersion: 1,
        fiscal: { ncm: '94036000', cfop: '5102', origem: '2', commercialUnit: 'UN', taxableUnit: 'UN' },
      },
      {
        quantity: 1,
        description: 'ITEM B',
        fiscalSnapshotVersion: 1,
        fiscal: { cst: '500', ncm: '94036000', origem: '0', commercialUnit: 'UN', taxableUnit: 'UN' },
      },
    ],
  };
  it('bloqueia prévia e emissão de revenda para não contribuinte antes do serviço fiscal', async () => {
    const invalid = { ...order, id: 'resale-non-taxpayer',
      fiscalContext: { acquisitionPurpose: 'resale', finalConsumer: false, recipientIeIndicator: '9' },
      customerData: { cpfCnpj: '12345678909', ieIndicator: '9', ie: '' } };
    const { result } = renderHook(() => useNfeEmission(invalid));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handlePreviewXml());
    await act(async () => result.current.handleEmit());
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('consumidor final'));
  });
  it('preserva em fila o último rascunho quando outro salvamento ainda está pendente', async () => {
    let finishFirst!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'queued-outbound-draft' }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94035000' }));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94036000' }));
    let second!: Promise<void>;
    act(() => { second = result.current.handleSaveDraft(); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    await act(async () => { finishFirst(); await Promise.all([first, second]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    const [firstChanges, lastChanges] = mocks.updateOrder.mock.calls.map((call) => call[1]);
    const environment = String(result.current.environment);
    expect(firstChanges.nfeDraft[environment].items[0].fiscal.ncm).toBe('94035000');
    expect(lastChanges.nfeDraft[environment].items[0].fiscal.ncm).toBe('94036000');
    expect(mocks.updateOrder.mock.calls.every((call) => call[4]?.metadataOnly === true)).toBe(true);
  });

  it('valida cada rascunho da fila e mantém a edição válida depois de um CPF inválido', async () => {
    let finishFirst!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'validated-outbound-queue', customerData: { personType: 'PF', cpfCnpj: '52998224725' } }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.setEnvironment(1));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    act(() => result.current.setRecipientTaxId('11111111111'));
    let invalid!: Promise<void>;
    act(() => { invalid = result.current.handleSaveDraft(); });
    act(() => result.current.setRecipientTaxId('11144477735'));
    let last!: Promise<void>;
    act(() => { last = result.current.handleSaveDraft(); });
    await act(async () => { finishFirst(); await Promise.all([first, invalid, last]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    expect(mocks.updateOrder.mock.calls[1][1].customerData.cpfCnpj).toBe('11144477735');
    expect(mocks.toast).toHaveBeenCalled();
  });

  it('descarta o rascunho ainda na fila quando o proprietário muda de pedido', async () => {
    let finishFirst!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
    const { result, rerender } = renderHook(({ id }) => useNfeEmission({ ...order, id }), { initialProps: { id: 'old-outbound-draft' } });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    let queued!: Promise<void>;
    act(() => { queued = result.current.handleSaveDraft(); });
    rerender({ id: 'new-outbound-draft' });
    await act(async () => { finishFirst(); await Promise.all([first, queued]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrder.mock.calls[0][0]).toBe('old-outbound-draft');
  });

  it.each(['ambiente', 'desmontagem', 'ida e volta'])(
    'descarta autosave obsoleto na fila após %s', async (transition) => {
      let finishFirst!: () => void;
      mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
      const { result, rerender, unmount } = renderHook(({ id }) => useNfeEmission({ ...order, id }), { initialProps: { id: 'draft-context-a' } });
      await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
      let first!: Promise<void>;
      act(() => { first = result.current.handleSaveDraft(); });
      await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
      let queued!: Promise<void>;
      act(() => { queued = result.current.handleSaveDraft(); });
      if (transition === 'ambiente') {
        act(() => result.current.setEnvironment(result.current.environment === 1 ? 2 : 1));
      } else if (transition === 'desmontagem') {
        unmount();
      } else {
        rerender({ id: 'draft-context-b' });
        rerender({ id: 'draft-context-a' });
      }
      await act(async () => { finishFirst(); await Promise.all([first, queued]); });
      expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    }
  );

  it('continua a fila de rascunhos após uma falha de persistência sem repetir o envio falho', async () => {
    let rejectFirst!: (reason: Error) => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((_resolve, reject) => { rejectFirst = reject; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'failed-outbound-queue' }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94035000' }));
    let first!: Promise<void>;
    act(() => { first = result.current.handleSaveDraft(); });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94036000' }));
    let queued!: Promise<void>;
    act(() => { queued = result.current.handleSaveDraft(); });
    await act(async () => { rejectFirst(new Error('synthetic rejected save')); await Promise.all([first, queued]); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    expect(mocks.updateOrder.mock.calls[1][1].nfeDraft[String(result.current.environment)].items[0].fiscal.ncm).toBe('94036000');
    expect(mocks.toast).toHaveBeenCalledWith('Não foi possível salvar os dados fiscais do rascunho no pedido.');
  });

  it('não aplica finalidade antiga ao trocar o pedido durante a gravação', async () => {
    let finish!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook(({ id, purpose }) => useNfeEmission({ ...order, id, fiscalContext: { acquisitionPurpose: purpose } }), { initialProps: { id: 'purpose-old', purpose: 'use_consumption' as 'use_consumption' | 'fixed_asset' } });
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleAcquisitionPurposeChange('resale'); });
    expect(mocks.updateOrder).toHaveBeenCalledTimes(1);
    rerender({ id: 'purpose-new', purpose: 'fixed_asset' });
    await act(async () => { finish(); await pending; });
    expect(result.current.acquisitionPurpose).toBe('fixed_asset');
  });

  it.each(['rascunho', 'finalidade'])('serializa finalidade e rascunho quando %s começa primeiro', async (firstKind) => {
    let finish!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'preparation-shared-queue' }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    let first!: Promise<void>;
    await act(async () => { first = firstKind === 'rascunho' ? result.current.handleSaveDraft() : result.current.handleAcquisitionPurposeChange('fixed_asset'); });
    let second!: Promise<void>;
    await act(async () => { second = firstKind === 'rascunho' ? result.current.handleAcquisitionPurposeChange('fixed_asset') : result.current.handleSaveDraft(); });
    const concurrentCalls = mocks.updateOrder.mock.calls.length;
    await act(async () => { finish(); await Promise.all([first, second]); });
    expect(concurrentCalls).toBe(1);
    expect(mocks.updateOrder).toHaveBeenCalledTimes(2);
    expect(result.current.acquisitionPurpose).toBe('fixed_asset');
  });

  it('limita a espera da finalidade sem aceitar a confirmação tardia', async () => {
    let finish!: () => void;
    mocks.updateOrder.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useNfeEmission({ ...order, id: 'purpose-timeout', fiscalContext: { acquisitionPurpose: 'fixed_asset' } }));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let pending!: Promise<void>;
    try {
      await act(async () => { pending = result.current.handleAcquisitionPurposeChange('resale'); });
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
      expect(result.current.isSavingAcquisitionPurpose).toBe(false);
      expect(result.current.acquisitionPurpose).toBe('fixed_asset');
    } finally {
      await act(async () => { finish(); await pending; });
      vi.useRealTimers();
    }
    expect(result.current.acquisitionPurpose).toBe('fixed_asset');
  });

  it('permite emitir diretamente e oferece prévia do XML somente ao administrador', async () => {
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const { unmount } = render(
      <NfeEmissionModal isOpen order={{ ...order, id: 'direct-emission-without-preview' }} onClose={vi.fn()} />
    );
    expect(screen.getByTestId('nfe-preview-xml-button')).toBeTruthy();
    await waitFor(() =>
      expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.preview).not.toHaveBeenCalled();

    unmount();
    cleanup();
    mocks.profileRole = 'manager';
    render(
      <NfeEmissionModal isOpen order={{ ...order, id: 'preview-hidden-for-manager' }} onClose={vi.fn()} />
    );
    await waitFor(() =>
      expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false)
    );
    expect(screen.queryByTestId('nfe-preview-xml-button')).toBeNull();
  });
  it.each([
    [
      'CEST',
      (value: any) => {
        value.items[0].fiscal.cest = '0100100';
      },
    ],
    [
      'origem',
      (value: any) => {
        value.items[0].fiscal.origem = '1';
      },
    ],
    [
      'NCM',
      (value: any) => {
        value.items[0].fiscal.ncm = '94035000';
      },
    ],
    [
      'IE',
      (value: any) => {
        value.customerData.ie = '123456789';
      },
    ],
    [
      'CPF/CNPJ',
      (value: any) => {
        value.customerData.cpfCnpj = '98765432100';
      },
    ],
    [
      'indIEDest',
      (value: any) => {
        value.fiscalContext = { recipientIeIndicator: '1' };
      },
    ],
    [
      'indFinal',
      (value: any) => {
        value.fiscalContext = { finalConsumer: true };
      },
    ],
    [
      'finalidade',
      (value: any) => {
        value.fiscalContext = { purpose: '2' };
      },
    ],
    [
      'endereço',
      (value: any) => {
        value.shipping.pickupAddress = { state: 'PR', street: 'Nova rua' };
      },
    ],
    [
      'quantidade',
      (value: any) => {
        value.items[0].quantity = 2;
      },
    ],
    [
      'ST',
      (value: any) => {
        value.items[0].fiscal.hasSt = true;
      },
    ],
    [
      'terceiros/própria',
      (value: any) => {
        value.items[0].merchandiseOrigin = 'own_production';
      },
    ],
  ])('invalida CFOP/CSOSN manual e prepara novamente ao alterar %s', async (_label, mutate) => {
    const manualFiscalFields = { current: new Map() };
    const initial = structuredClone(order);
    const { result, rerender } = renderHook(
      ({ source }) => useNfeItemEnrichment({ order: source, environment: 2, model: '55', manualFiscalFields }),
      { initialProps: { source: initial } }
    );
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.handleUpdateItemFiscal(0, { cfop: '5102', cst: '102' }));
    expect(result.current.nfeItems[0].fiscal.cst).toBe('102');
    const changed = structuredClone(initial);
    mutate(changed);
    rerender({ source: changed });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems[0].fiscal.cst).toBe('103');
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
  });

  it('edição manual de classificação mantém CFOP 5102 e CSOSN 103 por padrão', async () => {
    const manualFiscalFields = { current: new Map() };
    const { result } = renderHook(() =>
      useNfeItemEnrichment({ order, environment: 2, manualFiscalFields })
    );
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '94035000' }));
    expect(result.current.nfeItems[0].fiscal).toMatchObject({
      ncm: '94035000',
      cfop: '5102',
      cst: '103',
    });
  });

  it('mudança para SC elimina tributação interna e sugere CFOP interestadual compatível', async () => {
    const manualFiscalFields = { current: new Map() };
    const { result, rerender } = renderHook(
      ({ source }) => useNfeItemEnrichment({ order: source, environment: 2, model: '55', manualFiscalFields }),
      { initialProps: { source: order } }
    );
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    rerender({
      source: {
        ...order,
        customerData: { ...order.customerData, ie: '123456789' },
        fiscalContext: { recipientIeIndicator: '1' },
        shipping: {
          deliveryMethod: 'delivery',
          useCustomerAddress: false,
          deliveryAddress: { state: 'SC' },
        },
      },
    });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems[0].fiscal).toMatchObject({ cfop: '6102', cst: '103' });
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(mocks.prepare).toHaveBeenCalledTimes(2);
  });
  it('bloqueia a transmissão e identifica o item sem snapshot fiscal preparado', async () => {
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
    items[missingItemNumber - 1].fiscalSnapshotVersion = 0;

    render(
      <NfeEmissionModal
        isOpen
        order={{ ...order, items } as any}
        initialEnvironment={1}
        onClose={vi.fn()}
      />
    );

    await screen.findByTestId('nfe-fiscal-footer-error');
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.stringContaining(`itens ${missingItemNumber}`)
      )
    );
    expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByTestId('nfe-fiscal-footer-error').textContent).toContain(`itens ${missingItemNumber}`);
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('prepara CSOSN de NF-e sem recarregar o catálogo de um snapshot completo', async () => {
    const productId = '00000000-0000-4000-8000-000000000001';
    let resolveCsosns!: (items: any[]) => void;
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
        model: '55',
        manualFiscalFields,
      })
    );

    await waitFor(() => {
      expect(mocks.prepare).toHaveBeenCalledWith('TEST_AUT_parallel');
    });
    expect(result.current.isLoadingFiscalData).toBe(true);

    await act(async () => {
      resolveCsosns([{ itemNumber: 1, csosn: '103', source: 'default', cfop: '5102' }]);
    });

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.fiscalPreparationError).toBeNull();
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
  });

  it.each([
    { documentId: '   ' },
    { documentId: 'current-attempt', orderId: 'another-order' },
    { documentId: 'current-attempt', environment: 1 },
  ])('bloqueia consulta de tentativa incompatível antes de acessar a API: %j', async (identity) => {
    mocks.emit.mockResolvedValue({ success: false, pending: true, environment: 2, ...identity });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, pending: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    expect(result.current.emissionResult?.pending).toBe(true);
    mocks.toast.mockClear();
    await act(async () => { await result.current.handleReconcile(); });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalled();
    expect(result.current.emissionResult?.pending).toBe(true);
    expect(mocks.emit).toHaveBeenCalledTimes(1);
  });

  it('encaminha à consulta a identidade parseada pelo resolver real', async () => {
    mocks.emit.mockResolvedValue({ success: false, pending: true, environment: 2, documentId: '  current-attempt  ' });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, pending: true }) });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    await act(async () => { await result.current.handleReconcile(); });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ documentId: 'current-attempt' });
    expect(mocks.emit).toHaveBeenCalledTimes(1);
  });

  it('mantém a consulta pendente após timeout e ignora a autorização que chega atrasada', async () => {
    let completeFetch!: (response: unknown) => void;
    mocks.emit.mockResolvedValue({ success: false, pending: true, environment: 2, documentId: 'timeout-query' });
    const fetchMock = vi.fn(() => new Promise((resolve) => { completeFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useNfeEmission(order, onSuccess));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      let query!: ReturnType<typeof result.current.handleReconcile>;
      await act(async () => { query = result.current.handleReconcile(); });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); await query; });
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.emissionResult).toMatchObject({ pending: true, success: false });
      await act(async () => { completeFetch({ ok: true, json: async () => ({ success: true, state: 'authorized', protocolNumber: 'late-protocol' }) }); });
      expect(onSuccess).not.toHaveBeenCalled();
      expect(result.current.emissionResult).toMatchObject({ pending: true, success: false });
      expect(mocks.emit).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignora a consulta do pedido anterior e não fecha o novo proprietário', async () => {
    let completeFetch!: (response: unknown) => void;
    mocks.emit.mockResolvedValue({ success: false, pending: true, environment: 2, documentId: 'previous-owner-query' });
    const fetchMock = vi.fn(() => new Promise((resolve) => { completeFetch = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const onSuccess = vi.fn();
    const { result, rerender } = renderHook(({ id }) => useNfeEmission({ ...order, id }, onSuccess), { initialProps: { id: 'query-owner-a' } });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    let query!: ReturnType<typeof result.current.handleReconcile>;
    await act(async () => { query = result.current.handleReconcile(); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    rerender({ id: 'query-owner-b' });
    await act(async () => {
      completeFetch({ ok: true, json: async () => ({ success: true, state: 'authorized', protocolNumber: 'old-query-protocol' }) });
      await query;
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.emissionResult).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it('ignora o retorno da emissão iniciada pelo pedido anterior', async () => {
    let completeEmission!: (response: unknown) => void;
    mocks.emit.mockImplementationOnce(() => new Promise((resolve) => { completeEmission = resolve; }));
    const onSuccess = vi.fn();
    const { result, rerender } = renderHook(({ id }) => useNfeEmission({ ...order, id }, onSuccess), { initialProps: { id: 'emission-owner-a' } });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    let emission!: Promise<void>;
    await act(async () => { emission = result.current.handleEmit(); });
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    rerender({ id: 'emission-owner-b' });
    await act(async () => { completeEmission({ success: true, environment: 2 }); await emission; });
    expect(onSuccess).not.toHaveBeenCalled();
    expect(result.current.emissionResult).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
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
    await act(async () => result.current.handlePreviewXml());
    await act(async () => result.current.handleEmit());
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
  it.each([
    { orderId: 'different-order' }, { environment: 1 }, { documentId: '   ' }, { pending: true }, { success: true },
  ])('valida a retomada HML antes de arquivar ou limpar a tentativa: %j', async (override) => {
    mocks.emit.mockResolvedValue({ success: false, pending: false, environment: 2, orderId: order.id, documentId: 'restart-doc', emissionRequestId: 'restart-request', hmlCanAbandonTlsFailure: true, ...override });
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    await act(async () => result.current.handleStartFreshHmlEmission());
    expect(mocks.abandonAttempt).not.toHaveBeenCalled();
    expect(mocks.clearRequest).not.toHaveBeenCalled();
    expect(mocks.setReplacementSource).not.toHaveBeenCalled();
    expect(mocks.emit).toHaveBeenCalledTimes(1);
  });

  it('bloqueia retomada HML com dados novos inválidos antes do arquivamento', async () => {
    mocks.emit.mockResolvedValue({ success: false, pending: false, environment: 2, documentId: 'restart-doc', emissionRequestId: 'restart-request', hmlCanAbandonTlsFailure: true });
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    act(() => result.current.handleUpdateItemFiscal(0, { ncm: '' }));
    await act(async () => result.current.handleStartFreshHmlEmission());
    expect(mocks.abandonAttempt).not.toHaveBeenCalled();
    expect(mocks.clearRequest).not.toHaveBeenCalled();
    expect(mocks.emit).toHaveBeenCalledTimes(1);
  });

  it('usa identidades parseadas e impede duplo envio na retomada HML', async () => {
    let finish!: () => void;
    mocks.abandonAttempt.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve({ success: true, alreadyAbandoned: false }); }));
    mocks.emit.mockResolvedValue({ success: false, pending: false, environment: 2, documentId: '  restart-doc  ', emissionRequestId: '  restart-request  ', hmlCanAbandonTlsFailure: true });
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    let first!: Promise<void>;
    await act(async () => { first = result.current.handleStartFreshHmlEmission(); });
    await act(async () => result.current.handleStartFreshHmlEmission());
    expect(mocks.abandonAttempt).toHaveBeenCalledTimes(1);
    expect(mocks.abandonAttempt.mock.calls[0].slice(0, 3)).toEqual([order.id, 'restart-doc', 'restart-request']);
    await act(async () => { finish(); await first; });
    expect(mocks.emit).toHaveBeenCalledTimes(2);
  });

  it('não limpa nem retransmite HML após trocar o pedido durante o arquivamento', async () => {
    let finish!: () => void;
    mocks.abandonAttempt.mockImplementationOnce(() => new Promise((resolve) => { finish = () => resolve({ success: true, alreadyAbandoned: false }); }));
    mocks.emit.mockResolvedValue({ success: false, pending: false, environment: 2, documentId: 'restart-doc', emissionRequestId: 'restart-request', hmlCanAbandonTlsFailure: true });
    const { result, rerender } = renderHook(({ id }) => useNfeEmission({ ...order, id }), { initialProps: { id: 'restart-old' } });
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    let pending!: Promise<void>;
    await act(async () => { pending = result.current.handleStartFreshHmlEmission(); });
    rerender({ id: 'restart-new' });
    await act(async () => { finish(); await pending; });
    expect(mocks.clearRequest).not.toHaveBeenCalled();
    expect(mocks.setReplacementSource).not.toHaveBeenCalled();
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(result.current.emissionResult).toBeNull();
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

    await prepareNfeEmission();
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

    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
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

    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(await screen.findByText('Não foi possível autorizar a nota')).toBeTruthy();
    expect(screen.getByTestId('fiscal-issue-card').textContent).toMatch(
      /O NCM informado para um dos produtos não existe/
    );
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

    await prepareNfeEmission();
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

    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        documentId: 'fiscal-document-615',
        model: '65',
        environment: 2,
      })
    );
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
    expect(screen.getByTestId('nfe-number-preview-context').textContent).toContain(
      'Série 1 · Homologação'
    );
    expect(mocks.nextNumber).toHaveBeenCalledWith('55', DEFAULT_NFE_ENVIRONMENT, '1', 102);

    await prepareNfeEmission();
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
    await prepareNfeEmission();
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
    await prepareNfeEmission();
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
    fireEvent.change(number, { target: { value: '615' } });
    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    fireEvent.click(await screen.findByRole('button', { name: /Consultar SEFAZ agora/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const fresh = await screen.findByTestId('nfe-start-fresh-hml-emission');
    await waitFor(() => expect((fresh as HTMLButtonElement).disabled).toBe(false));
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
    fireEvent.change(number, { target: { value: '615' } });
    await prepareNfeEmission();
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
    await prepareNfeEmission();
    const emit = screen.getByTestId('nfe-emit-button');
    fireEvent.click(emit);
    fireEvent.click(emit);
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
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
    await prepareNfeEmission();
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
    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    const consult = await screen.findByRole('button', { name: 'Consultar tentativa em andamento' });
    fireEvent.click(consult);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));
    expect(
      await screen.findByText('Estamos confirmando o que aconteceu com esta nota')
    ).toBeTruthy();
    expect(mocks.toast).not.toHaveBeenCalled();
    expect(screen.queryByTestId('nfe-emit-button')).toBeNull();
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Consultar tentativa em andamento' })
    );
    await waitFor(() => expect(screen.getByTestId('nfe-emit-button')).toBeTruthy());
    await prepareNfeEmission();
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

    await prepareNfeEmission();
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
    await prepareNfeEmission();
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
    await prepareNfeEmission();
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

  it('mostra rejeição SEFAZ no aviso fiscal mesmo sem código de erro da API', async () => {
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
    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(await screen.findByText('Não foi possível autorizar a nota')).toBeTruthy();
    expect(screen.getByTestId('fiscal-issue-card').textContent).toContain(
      'Dados do pagamento com cartão não informados'
    );
    expect(screen.getByTestId('nfe-fiscal-footer-error').textContent).not.toContain('UNKNOWN');
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
    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));

    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Nota recebida em homologação · sem valor fiscal')).toBeNull();
  });

  it('mostra carregamento não bloqueante e deixa CPF opcional na NFC-e comum', async () => {
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const pickupOrder = {
      ...order,
      id: 'synthetic-nfce-without-tax-id',
      customerData: { fullName: 'Cliente', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 100 },
      fiscalContext: { finalConsumer: true },
      items: [{ ...order.items[0], productId: 'registered-product', fiscal: { ...order.items[0].fiscal, cst: '102' } }],
    } as any;

    render(<NfeEmissionModal isOpen order={pickupOrder} onClose={vi.fn()} />);
    expect(screen.getByText('Carregando dados do cliente e dos produtos…')).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false);
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(screen.queryByText('Carregando dados do cliente e dos produtos…')).toBeNull()
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Informações do Cliente' }));
    expect(screen.getByLabelText('CPF')).toBeTruthy();
    expect(
      screen.getByText('Documento opcional nesta NFC-e; se informado, será validado.')
    ).toBeTruthy();
    await prepareNfeEmission();
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][6]).toBe('');
  });

  it.each([undefined, '94036000'])(
    'preserva o NCM do snapshot (%s), mesmo com catálogo divergente',
    async (savedNcm) => {
      const registeredOrder: any = {
        ...order,
        id: `catalog-ncm-${savedNcm || 'empty'}`,
        items: [{ ...order.items[0], productId: 'registered-product', fiscal: { ...order.items[0].fiscal, ncm: savedNcm } }],
      };
      const original = structuredClone(registeredOrder);
      mocks.getProductsFiscalData.mockResolvedValue(
        new Map([['registered-product', { id: 'registered-product', ncm: '94035000' }]])
      );
      render(<NfeEmissionModal isOpen order={registeredOrder} onClose={vi.fn()} />);
      await waitFor(() =>
        expect((screen.getByRole('textbox', { name: 'NCM' }) as HTMLInputElement).value).toBe(
          savedNcm || ''
        )
      );
      expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
      expect(registeredOrder).toEqual(original);
    }
  );

  it('preserva o NCM capturado na variação mesmo se o catálogo atual mudar', async () => {
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
    expect(result.current.nfeItems[0].fiscal.ncm).toBe('94036000');
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
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
    expect(reopened.result.current.nfeItems[0].fiscal).toMatchObject({ cfop: '5102', cst: '103' });
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    await act(async () => reopened.result.current.handlePreviewXml());
    await act(async () => reopened.result.current.handleEmit());
    expect(mocks.emit.mock.calls[0][0].items[0].fiscal.ncm).toBe('94034000');
    expect(registeredOrder).toEqual(original);
  });

  it('preserva o CSOSN do snapshot de cada item e permite revisão manual', async () => {
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
      expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['102', '500'])
    );
    expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['102', '500']);
    expect(mocks.prepare).not.toHaveBeenCalled();
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
    await act(async () => result.current.handlePreviewXml());
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('Configuração indisponível');
  });
  it('abre cenário interestadual em edição e só mostra o bloqueio ao clicar em emitir', async () => {
    mocks.prepare.mockRejectedValue(
      new Error(
        'HML_INTERSTATE_MATRIX_NOT_APPROVED: ainda não existe tratamento fiscal aprovado para esta combinação.'
      )
    );
    const interstateOrder: any = {
      ...order,
      id: 'hml-interstate-matrix-pending',
      customerData: {
        ...order.customerData,
        fullName: 'TEST_AUT_PJ_SC',
        cpfCnpj: '12345678000195',
        personType: 'PJ',
        ie: '123456789',
        state: 'SC',
      },
      fiscalContext: {
        acquisitionPurpose: 'resale',
        finalConsumer: false,
        recipientIeIndicator: '1',
      },
      shipping: {
        deliveryMethod: 'delivery',
        useCustomerAddress: false,
        deliveryAddress: { state: 'SC' },
      },
    };

    render(
      <NfeEmissionModal isOpen order={interstateOrder} initialEnvironment={2} onClose={vi.fn()} />
    );

    expect(screen.queryByText('Tratamento fiscal não aprovado')).toBeNull();
    expect((await screen.findByTestId('nfe-fiscal-footer-error')).textContent).toMatch(
      /tratamento fiscal aprovado/i
    );
    expect(mocks.toast).not.toHaveBeenCalled();

    await requestXmlPreview();
    fireEvent.click(await screen.findByTestId('nfe-fiscal-issue-trigger'));

    expect(await screen.findByText('Tratamento fiscal não aprovado')).toBeTruthy();
    expect(screen.getAllByText(/responsável fiscal/).length).toBeGreaterThan(0);
    expect(mocks.emit).not.toHaveBeenCalled();
  });
  it('exige e persiste a finalidade da compra antes de resolver o modelo fiscal', async () => {
    const unspecifiedOrder = structuredClone(order);
    unspecifiedOrder.shipping = { deliveryMethod: 'delivery', deliveryAddress: { state: 'SC' } };
    unspecifiedOrder.fiscalContext = { finalConsumer: true };
    render(<NfeEmissionModal isOpen order={unspecifiedOrder} onClose={vi.fn()} />);
    expect(screen.getByText(/Modelo fiscal a definir/)).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Selecione a finalidade' })).toBeTruthy();
    const purpose = screen.getByLabelText('Finalidade da compra');
    fireEvent.change(purpose, { target: { value: 'use_consumption' } });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/NF-e · modelo 55 necessária/)).toBeTruthy());
    expect(mocks.updateOrder).toHaveBeenCalledWith(unspecifiedOrder.id, {
      fiscalContext: {
        acquisitionPurpose: 'use_consumption',
        finalConsumer: true,
      },
    }, expect.objectContaining({ id: unspecifiedOrder.id }), undefined, { metadataOnly: true });
    expect(screen.getByText(/NF-e · modelo 55 necessária/)).toBeTruthy();
    expect(purpose.className).toContain('border-0');
    expect(purpose.className).toContain('border-b-2');
    expect(purpose.className).toContain('focus:border-blue-600');
    expect(screen.getByRole('option', { name: 'Uso / consumo próprio' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Revenda' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Ativo imobilizado' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /^(Sim|Não)/ })).toBeNull();
    expect(screen.queryByLabelText('Entrega própria da loja')).toBeNull();
    expect(screen.queryByLabelText('Cartão em terminal separado')).toBeNull();
    fireEvent.change(purpose, { target: { value: 'resale' } });
    await waitFor(() => expect(mocks.updateOrder).toHaveBeenCalledTimes(2));
    expect(screen.getByText(/NF-e · modelo 55 necessária/)).toBeTruthy();
    expect(screen.getByText(/Mercadoria destinada à revenda/)).toBeTruthy();
    expect(unspecifiedOrder.fiscalContext).toEqual({ finalConsumer: true });
  });

  it('não usa indFinal=true como padrão quando o pedido não tem finalidade persistida', () => {
    const unspecifiedOrder = structuredClone(order);
    unspecifiedOrder.shipping = { deliveryMethod: 'delivery', deliveryAddress: { state: 'SC' } };
    unspecifiedOrder.fiscalContext = { finalConsumer: true };
    const { result } = renderHook(() => useNfeEmission(unspecifiedOrder));
    expect(result.current.acquisitionPurpose).toBeNull();
    expect(result.current.finalConsumer).toBeUndefined();
    expect(result.current.modelDecision).toMatchObject({ status: 'blocked' });
  });

  it('mantém emissão bloqueada se a persistência da finalidade falhar', async () => {
    const unspecifiedOrder = structuredClone(order);
    unspecifiedOrder.shipping = { deliveryMethod: 'delivery', deliveryAddress: { state: 'SC' } };
    mocks.updateOrder.mockRejectedValueOnce(new Error('TEST_AUT_SAVE_FAILURE'));
    const { result } = renderHook(() => useNfeEmission(unspecifiedOrder));
    await act(async () => result.current.handleAcquisitionPurposeChange('use_consumption'));
    expect(result.current.acquisitionPurpose).toBeNull();
    expect(result.current.finalConsumer).toBeUndefined();
    await act(async () => result.current.handlePreviewXml());
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Não foi possível salvar a finalidade da compra no pedido.'
    );
  });

  it('bloqueia NF-e 55 sem CPF/CNPJ antes de chamar a emissão', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-missing-tax-id',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'PR' } },
      fiscalContext: { acquisitionPurpose: 'resale', finalConsumer: false },
      customerData: { fullName: 'Cliente', personType: 'PF' },
    };
    const { result } = renderHook(() => useNfeEmission(deliveryOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handlePreviewXml());
    expect(result.current.recipientTaxIdError).toBe(
      'A NF-e modelo 55 desta venda doméstica exige CPF do destinatário.'
    );
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'A NF-e modelo 55 desta venda doméstica exige CPF do destinatário.'
    );
  });

  it('permite emitir NFC-e modelo 65 de retirada abaixo de R$ 10.000 sem exigir CPF ou CNPJ', async () => {
    const nfcePickupOrder: any = {
      ...order,
      id: 'nfce-pickup-without-tax-id',
      shipping: { deliveryMethod: 'pickup' },
      customerData: { fullName: 'Consumidor', personType: 'PF' },
      paymentsSummary: { totalOrderValue: 4500 },
      fiscalContext: {
        acquisitionPurpose: 'use_consumption',
        finalConsumer: true,
        presence: '4',
      },
    };
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={nfcePickupOrder} onClose={vi.fn()} />);
    await prepareNfeEmission();
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
      fiscalContext: { acquisitionPurpose: 'use_consumption', finalConsumer: true },
    };
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={nfceDeliveryOrder} onClose={vi.fn()} />);
    await requestXmlPreview();
    fireEvent.click(screen.getByRole('tab', { name: 'Informações do Cliente' }));
    expect(
      screen.getByText(
        'Como este pedido será entregue no endereço do cliente, o CPF do destinatário é obrigatório para a NFC-e.'
      )
    ).toBeTruthy();
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
      fiscalContext: { acquisitionPurpose: 'use_consumption', finalConsumer: true },
    };
    render(<NfeEmissionModal isOpen order={highValueNfceOrder} onClose={vi.fn()} />);
    await requestXmlPreview();
    const field = await screen.findByLabelText(/CPF/);
    await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
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
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'PR' } },
      fiscalContext: { acquisitionPurpose: 'resale', finalConsumer: false },
      customerData: { fullName: 'Cliente', personType: 'PF' },
    };
    render(<NfeEmissionModal isOpen order={deliveryOrder} onClose={vi.fn()} />);
    await requestXmlPreview();
    const field = await screen.findByLabelText(/CPF/);
    await waitFor(() => expect(field.getAttribute('aria-invalid')).toBe('true'));
    expect(field.getAttribute('aria-describedby')).toBe('nfe-recipient-tax-id-error');
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('usa o CPF válido digitado apenas para esta emissão sem gravá-lo no pedido', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-temporary-tax-id',
      shipping: { deliveryMethod: 'delivery', deliveryAddress: { state: 'PR' } },
      customerData: { fullName: 'Cliente', personType: 'PF', ieIndicator: '1', ie: '1234567890' },
    };
    const original = structuredClone(deliveryOrder);
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const { result } = renderHook(() => useNfeEmission(deliveryOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    act(() => result.current.setRecipientTaxId('123.456.789-09'));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handlePreviewXml());
    await act(async () => result.current.handleEmit());
    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(mocks.emit.mock.calls[0][6]).toBe('123.456.789-09');
    expect(deliveryOrder).toEqual(original);
  });

  it('mantém todos os campos após fechar/desmontar e reabrir o modal, sem alterar pedido', async () => {
    const original = structuredClone(order);
    const changes = { ncm: '94034000', cfop: '5102', origem: '2', cest: '2804400', cst: '102' };
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
    await act(async () => reopened.result.current.handlePreviewXml());
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
    fireEvent.click(
      screen.getByRole('button', { name: /Emissão de NF de saída|Emitir nota fiscal de saída/i })
    );

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

  it('mantém as linhas e o botão acessíveis para explicar a falha da preparação', async () => {
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
    expect(await screen.findByTestId('nfe-fiscal-footer-error')).toBeTruthy();
    expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('informa exatamente o campo NCM faltante com toast específico, alterna para a aba de itens e destaca o campo', async () => {
    const orderMissingNcm: any = {
      ...order,
      id: 'missing-ncm-order',
      items: [
        {
          quantity: 1,
          description: 'CADEIRA GAMER',
          fiscalSnapshotVersion: 1,
          fiscal: { ...order.items[0].fiscal, ncm: '', cfop: '5102', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderMissingNcm} onClose={vi.fn()} />);
    await requestXmlPreview();

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
          fiscalSnapshotVersion: 1,
          fiscal: { ...order.items[0].fiscal, ncm: '9403', cfop: '5102', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderInvalidNcm} onClose={vi.fn()} />);
    await requestXmlPreview();

    expect(mocks.toast).toHaveBeenCalledWith(
      'NCM do produto "MESA OFFICE" deve conter exatamente 8 dígitos.'
    );
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('restaura o CFOP determinado pela matriz após limpar a busca e transmite o valor resolvido', async () => {
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    const orderMissingCfop: any = {
      ...order,
      id: 'missing-cfop-order',
      items: [
        {
          quantity: 1,
          description: 'ESTANTE DE LIVROS',
          merchandiseOrigin: 'own_production',
          fiscalSnapshotVersion: 1,
          fiscal: { ...order.items[0].fiscal, ncm: '94036000', cfop: '5101', cst: '102', origem: '0' },
        },
      ],
    };

    render(<NfeEmissionModal isOpen order={orderMissingCfop} onClose={vi.fn()} />);

    await prepareNfeEmission();

    // Na interface, o usuário limpa o CFOP do item
    fireEvent.click(screen.getByRole('tab', { name: 'Itens' }));
    // Abre a sanfona de campos fiscais
    const expandButtons = screen.getAllByTitle('Ver / editar CFOP, CSOSN, Origem e CEST');
    fireEvent.click(expandButtons[0]);
    const cfopSelect = document.getElementById('nfe-item-cfop-0') as HTMLInputElement;
    fireEvent.change(cfopSelect, { target: { value: '' } });

    expect((screen.getByTestId('nfe-emit-button') as HTMLButtonElement).disabled).toBe(false);
    await requestXmlPreview();

    expect(mocks.emit).toHaveBeenCalledTimes(1);
    expect(mocks.emit.mock.calls[0][0].items[0].fiscal.cfop).toBe('5101');
    fireEvent.blur(cfopSelect);
    await waitFor(() => expect(cfopSelect.value).toBe('5101'));
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.stringContaining('Selecione o CFOP'));
  });

  it('exibe o CSOSN 103 por padrão e permite edição manual', async () => {
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);
    await prepareNfeEmission();

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
    expect(mocks.prepareOrderSnapshot).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(hmlButton?.getAttribute('title')).toBe(
      'Nota fiscal de homologação já emitida para este pedido.'
    );
  });

  it('abre o fluxo de produção no modal prévio quando ainda não foi emitida', async () => {
    const orderForTest: any = {
      ...order,
      id: 'prod-test-order',
      nfeData: null,
    };
    const onSelectEnvironment = vi.fn();

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={orderForTest}
        onClose={vi.fn()}
        onSelectEnvironment={onSelectEnvironment}
      />
    );

    const prodButton = screen.getByText('Produção').closest('button');
    expect(prodButton?.hasAttribute('disabled')).toBe(false);
    expect(prodButton?.getAttribute('title')).toContain('tpAmb=1');
    fireEvent.click(prodButton!);
    await waitFor(() =>
      expect(mocks.prepareOrderSnapshot).toHaveBeenCalledWith(orderForTest, 1)
    );
    expect(onSelectEnvironment).toHaveBeenCalledWith(1, orderForTest);
  });

  it('mantém Produção disponível quando o pedido tem somente uma NFC-e de homologação', async () => {
    const hmlOrder: any = {
      ...order,
      id: 'hml-only-order',
      nfeData: {
        status: 'homologada',
        environment: 2,
        accessKey: '41261000000000000000650010000005991000000010',
        protocolNumber: '123456789',
      },
    };
    const onSelectEnvironment = vi.fn();

    render(
      <NfeEnvironmentChoiceModal
        isOpen
        order={hmlOrder}
        onClose={vi.fn()}
        onSelectEnvironment={onSelectEnvironment}
      />
    );

    const prodButton = screen.getByText('Produção').closest('button');
    expect(prodButton?.hasAttribute('disabled')).toBe(false);
    fireEvent.click(prodButton!);
    await waitFor(() => expect(mocks.prepareOrderSnapshot).toHaveBeenCalledWith(hmlOrder, 1));
    expect(onSelectEnvironment).toHaveBeenCalledWith(1, hmlOrder);
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

    const issueNfeButton = screen.getByText(/Emissão de NF de saída/i).closest('button');
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

    const issueNfeButton = screen.getByText(/Emissão de NF de saída/i);
    fireEvent.click(issueNfeButton);

    expect(screen.getByText('Selecione o ambiente fiscal', { exact: false })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Homologação/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Produção/i })).toBeTruthy();
  });

  it('prepara novamente a resolução fiscal quando a condição do destinatário muda', async () => {
    mocks.prepare.mockClear();

    const registeredOrder: any = {
      ...order,
      id: 'stable-deps-order',
      items: [{ ...order.items[0], productId: 'stable-prod-1' }],
      customerData: { ...order.customerData, personType: 'PF' },
    };

    const { result, rerender } = renderHook(({ orderProp }) => useNfeEmission(orderProp), {
      initialProps: { orderProp: registeredOrder },
    });

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    const initialCallCount = mocks.prepare.mock.calls.length;
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

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(mocks.prepare.mock.calls.length).toBe(initialCallCount + 1);
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
  });

  it('não reinicia o carregamento fiscal dos itens enquanto o CPF do destinatário é digitado', async () => {
    mocks.prepare.mockClear();
    const registeredOrder: any = {
      ...order,
      id: 'typing-tax-id-order',
      items: [{ ...order.items[0], productId: 'typing-product' }],
      customerData: { ...order.customerData, personType: 'PF' },
    };
    const { result } = renderHook(() => useNfeEmission(registeredOrder));

    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    const initialCallCount = mocks.prepare.mock.calls.length;
    expect(initialCallCount).toBe(1);

    for (const value of ['1', '12', '123', '1234', '12345']) {
      await act(async () => result.current.setRecipientTaxId(value));
      await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
      expect(result.current.recipientTaxId).toBe(value);
    }

    expect(mocks.prepare).toHaveBeenCalledTimes(initialCallCount);
    expect(mocks.getProductsFiscalData).not.toHaveBeenCalled();
  });
});
