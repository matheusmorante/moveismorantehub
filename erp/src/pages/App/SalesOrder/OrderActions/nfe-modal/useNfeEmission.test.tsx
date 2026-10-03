// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNfeEmission } from './useNfeEmission';
import { NfeEmissionModal } from '../NfeEmissionModal';
import PostOrderActionsModal from '../PostOrderActionsModal';
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), emit: vi.fn(), toast: vi.fn(), searchNcms: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'administrator' } }) }));
vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({ prepareHmlItemCsosns: mocks.prepare }));
vi.mock('@/pages/utils/nfe/nfeService', () => ({ emitNfeForOrder: mocks.emit, printOrderDanfe: vi.fn() }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ fiscalDefaults: { cst: '102' } }) }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('@/services/fiscal/ncmService', () => ({ ncmService: { searchNcms: mocks.searchNcms } }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.toast, success: vi.fn() } }));
describe('preenchimento dos itens da NF-e', () => {
  afterEach(() => cleanup());
  beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue([
    { itemNumber: 1, csosn: '103', source: 'default' },
    { itemNumber: 2, csosn: '500', source: 'saved' },
  ]); mocks.searchNcms.mockResolvedValue([]); });
  const order: any = { id: 'synthetic-order', items: [
    { quantity: 1, description: 'ITEM A', fiscal: { ncm: '94036000', cfop: '5102', origem: '2' } },
    { quantity: 1, description: 'ITEM B', fiscal: { cst: '500', ncm: '94036000', origem: '0' } },
  ] };
  it('usa os códigos preparados no servidor e preserva os demais dados', async () => {
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['103', '500']));
    expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['103', '500']);
    expect(result.current.nfeItems[0].fiscal).toMatchObject({ ncm: '94036000', cfop: '5102', origem: '2' });
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

  it('mantém todos os campos após fechar/desmontar e reabrir o modal, sem alterar pedido', async () => {
    const original = structuredClone(order);
    const changes = { ncm: '94034000', cfop: '5101', origem: '2', cest: '2804400', cst: '102' };
    const reopenOrder = { ...order, id: 'reopen-order' };
    const first = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() => expect(first.result.current.nfeItems[0]?.fiscal.cst).toBe('103'));
    act(() => first.result.current.handleUpdateItemFiscal(0, changes));
    first.unmount();
    const reopened = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() => expect(reopened.result.current.nfeItems[0]?.fiscal.csosnSource).toBe('manual'));
    expect(reopened.result.current.nfeItems[0].fiscal).toMatchObject({ ...changes, csosnSource: 'manual' });
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
        { ...order.items[0], orderItemId: 'new-stock', productId: 'product-new',
          itemType: 'product', condition: 'novo', description: 'Produto de estoque novo' },
        { ...order.items[0], orderItemId: 'used-stock', productId: undefined,
          variationId: undefined, isTemporaryProduct: true, itemType: 'product',
          condition: 'usado', description: 'Produto usado sem vínculo de estoque' },
        { ...order.items[0], orderItemId: 'salvaged-stock', productId: undefined,
          variationId: undefined, isTemporaryProduct: true, itemType: 'product',
          condition: 'salvado', description: 'Produto salvado sem vínculo de estoque' },
        { ...order.items[0], orderItemId: 'unregistered', productId: undefined,
          variationId: undefined, isTemporaryProduct: true, itemType: 'product',
          description: 'Item avulso não cadastrado' },
        { ...order.items[0], orderItemId: 'service', itemType: 'service',
          description: 'Serviço de montagem' },
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
      items: [{ ...order.items[0], productId: undefined, isTemporaryProduct: true,
        description: 'Item avulso para conferência' }],
    };

    render(
      <NfeEmissionModal isOpen order={orderWithUnregisteredItem} onClose={vi.fn()} />
    );

    expect(await screen.findByText('Item avulso para conferência')).toBeTruthy();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('nfe-emit-button').hasAttribute('disabled')).toBe(true);
  });

  it('pesquisa tag no campo NCM do modal e seleciona o resultado sem transmitir a nota', async () => {
    const orderForSearch: any = {
      ...order,
      items: [{ ...order.items[0], fiscal: { ...order.items[0].fiscal, ncm: '' } }],
    };
    const originalOrder = structuredClone(orderForSearch);
    mocks.searchNcms.mockImplementation(async (searchTerm: string) => searchTerm === 'armário para cozinha'
      ? [{ code: '94034000', official_description: 'Móveis de madeira para cozinhas', alias_match: 'armário para cozinha MDF/MDP', rank: 1.5 }]
      : []);

    render(<NfeEmissionModal isOpen order={orderForSearch} onClose={vi.fn()} />);
    await screen.findByRole('dialog', { name: 'Emitir nota fiscal de saída' });
    await waitFor(() => expect(screen.queryByText(/Carregando NCMs e dados fiscais/)).toBeNull());

    const ncmInput = screen.getByRole('textbox', { name: 'NCM' });
    fireEvent.change(ncmInput, { target: { value: 'armário para cozinha' } });
    const tagResult = await screen.findByText('armário para cozinha MDF/MDP');
    fireEvent.click(tagResult);

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'NCM' })).toHaveProperty('value', '94034000'));
    expect(mocks.searchNcms).toHaveBeenCalledWith('armário para cozinha', 10);
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(orderForSearch).toEqual(originalOrder);
  });
});
