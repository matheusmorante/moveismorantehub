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
import { useNfeEmission } from './useNfeEmission';
import { NfeEmissionModal } from '../NfeEmissionModal';
import PostOrderActionsModal from '../PostOrderActionsModal';
import { DEFAULT_NFE_ENVIRONMENT } from '@/pages/utils/nfe/nfeEnvironment';
const mocks = vi.hoisted(() => ({
  prepare: vi.fn(),
  emit: vi.fn(),
  toast: vi.fn(),
  nextNumber: vi.fn(),
  getFullProduct: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ profile: { role: 'administrator' } }),
}));
vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({
  prepareHmlItemCsosns: mocks.prepare,
}));
vi.mock('@/pages/utils/nfe/nfeService', () => ({
  emitNfeForOrder: mocks.emit,
  getNextNfeNumberPreview: mocks.nextNumber,
  getCachedFiscalNumberPreview: vi.fn(() => null),
  updateFiscalNumberPreviewCache: vi.fn(),
  printOrderDanfe: vi.fn(),
}));
vi.mock('@/pages/utils/settingsService', () => ({
  getSettings: () => ({ fiscalDefaults: { cst: '102' } }),
}));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: mocks.getFullProduct }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('./NcmSelect', () => ({
  NcmSelect: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="NCM" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock('react-toastify', () => ({ toast: { error: mocks.toast, success: vi.fn() } }));
describe('preenchimento dos itens da NF-e', () => {
  afterEach(() => cleanup());
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.nextNumber.mockResolvedValue(102);
    mocks.prepare.mockResolvedValue([
      { itemNumber: 1, csosn: '103', source: 'default' },
      { itemNumber: 2, csosn: '500', source: 'saved' },
    ]);
  });
  const order: any = {
    id: 'synthetic-order',
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
  it('mostra a sequência como prévia e permite edição manual', async () => {
    mocks.nextNumber.mockResolvedValue(112);
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    render(<NfeEmissionModal isOpen order={order} onClose={vi.fn()} />);

    const preview = (await screen.findByRole('textbox', {
      name: 'Prévia do próximo número fiscal',
    })) as HTMLInputElement;
    await waitFor(() => expect(preview.value).toBe('112'));
    expect(preview.readOnly).toBe(false);
    expect(screen.getByTestId('nfe-number-preview-context').textContent).toBe(
      'NF-e 55 · Série 1 · Homologação'
    );
    expect(mocks.nextNumber).toHaveBeenCalledWith('55', DEFAULT_NFE_ENVIRONMENT, '1', 102);

    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    await waitFor(() => expect(mocks.emit).toHaveBeenCalledTimes(1));
    expect(mocks.emit.mock.calls[0][4]).toBeUndefined();
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

  it.each([undefined, '94036000'])(
    'autopreenche o campo do modal com o NCM cadastrado quando o pedido contém %s',
    async (savedNcm) => {
      const registeredOrder: any = {
        ...order,
        id: `catalog-ncm-${savedNcm || 'empty'}`,
        items: [{ ...order.items[0], productId: 'registered-product', fiscal: { ncm: savedNcm } }],
      };
      const original = structuredClone(registeredOrder);
      mocks.getFullProduct.mockResolvedValue({ fiscal: { ncm: '94035000' } });
      render(<NfeEmissionModal isOpen order={registeredOrder} onClose={vi.fn()} />);
      await waitFor(() =>
        expect((screen.getByRole('textbox', { name: 'NCM' }) as HTMLInputElement).value).toBe(
          '94035000'
        )
      );
      expect(mocks.getFullProduct).toHaveBeenCalledWith('registered-product');
      expect(registeredOrder).toEqual(original);
    }
  );

  it('herda o NCM do produto quando a variação cadastrada não tem NCM próprio', async () => {
    mocks.getFullProduct.mockResolvedValue({
      fiscal: { ncm: '94035000' },
      variations: [{ id: 'variation-without-ncm' }],
    });
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
    mocks.getFullProduct.mockResolvedValue({ fiscal: { ncm: '' } });
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
    mocks.getFullProduct.mockResolvedValue({ fiscal: { ncm: '94035000' } });
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

  it('usa os códigos preparados no servidor e preserva os demais dados', async () => {
    const { result } = renderHook(() => useNfeEmission(order));
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

  it('bloqueia NF-e de entrega sem CPF/CNPJ antes de chamar a emissão', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-missing-tax-id',
      shipping: { deliveryMethod: 'delivery' },
      customerData: { fullName: 'Cliente' },
    };
    const { result } = renderHook(() => useNfeEmission(deliveryOrder));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    await act(async () => result.current.handleEmit());
    expect(result.current.recipientTaxIdError).toBe(
      'CPF ou CNPJ do destinatário é obrigatório para emitir NF-e modelo 55.'
    );
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Informe o CPF/CNPJ do destinatário para emitir a NF-e deste pedido de entrega.'
    );
  });

  it('destaca o campo de destinatário no modal e mantém a emissão parada', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-missing-tax-id-ui',
      shipping: { deliveryMethod: 'delivery' },
      customerData: { fullName: 'Cliente' },
    };
    render(<NfeEmissionModal isOpen order={deliveryOrder} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(false)
    );
    fireEvent.click(screen.getByTestId('nfe-emit-button'));
    const field = await screen.findByLabelText(/Insira o CPF/);
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(
      await screen.findByText(
        /CPF ou CNPJ do destinatário é obrigatório para emitir NF-e modelo 55/
      )
    ).toBeTruthy();
    expect(mocks.emit).not.toHaveBeenCalled();
  });

  it('usa o CPF válido digitado apenas para esta emissão sem gravá-lo no pedido', async () => {
    const deliveryOrder: any = {
      ...order,
      id: 'delivery-temporary-tax-id',
      shipping: { deliveryMethod: 'delivery' },
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

    expect(await screen.findByRole('dialog', { name: 'Emitir nota fiscal de saída' })).toBeTruthy();
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

    expect(await screen.findByText('Item avulso para conferência')).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(true);
  });
});
