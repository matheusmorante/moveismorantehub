// @vitest-environment happy-dom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNfeEmission } from './useNfeEmission';
const mocks = vi.hoisted(() => ({ prepare: vi.fn(), emit: vi.fn(), toast: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ profile: { role: 'administrator' } }) }));
vi.mock('@/pages/utils/nfe/csosnConfigurationService', () => ({ prepareHmlItemCsosns: mocks.prepare }));
vi.mock('@/pages/utils/nfe/nfeService', () => ({ emitNfeForOrder: mocks.emit, printOrderDanfe: vi.fn() }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: () => ({ fiscalDefaults: { cst: '102' } }) }));
vi.mock('@/pages/utils/productService', () => ({ getFullProduct: vi.fn() }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: {} }));
vi.mock('react-toastify', () => ({ toast: { error: mocks.toast, success: vi.fn() } }));
describe('preenchimento dos itens da NF-e', () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.prepare.mockResolvedValue([
    { itemNumber: 1, csosn: '103', source: 'default' },
    { itemNumber: 2, csosn: '500', source: 'saved' },
  ]); });
  const order: any = { id: 'synthetic-order', items: [
    { quantity: 1, description: 'ITEM A', fiscal: { ncm: '94036000', cfop: '5102', origem: '2' } },
    { quantity: 1, description: 'ITEM B', fiscal: { cst: '500', ncm: '94036000', origem: '0' } },
  ] };
  it('usa os códigos preparados no servidor e preserva os demais dados', async () => {
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.nfeItems).toHaveLength(2));
    expect(result.current.nfeItems.map((item) => item.fiscal.cst)).toEqual(['103', '500']);
    expect(result.current.nfeItems[0].fiscal).toMatchObject({ ncm: '94036000', cfop: '5102', origem: '2' });
    act(() => result.current.handleUpdateItemFiscal(0, { cst: '102' }));
    expect(result.current.nfeItems[0].fiscal).toMatchObject({ cst: '102', csosnSource: 'manual' });
  });
  it('não oferece itens com um padrão local se a preparação falhar', async () => {
    mocks.prepare.mockRejectedValue(new Error('Configuração indisponível'));
    const { result } = renderHook(() => useNfeEmission(order));
    await waitFor(() => expect(result.current.isLoadingFiscalData).toBe(false));
    expect(result.current.nfeItems).toEqual([]);
    expect(mocks.toast).toHaveBeenCalledWith('Configuração indisponível');
  });

  it('mantém todos os campos após fechar/desmontar e reabrir o modal, sem alterar pedido', async () => {
    const original = structuredClone(order);
    const changes = { ncm: '94034000', cfop: '5101', origem: '2', cest: '2804400', cst: '102' };
    const reopenOrder = { ...order, id: 'reopen-order' };
    const first = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() => expect(first.result.current.nfeItems).toHaveLength(2));
    act(() => first.result.current.handleUpdateItemFiscal(0, changes));
    first.unmount();
    const reopened = renderHook(() => useNfeEmission(reopenOrder));
    await waitFor(() => expect(reopened.result.current.nfeItems).toHaveLength(2));
    expect(reopened.result.current.nfeItems[0].fiscal).toMatchObject({ ...changes, csosnSource: 'manual' });
    mocks.emit.mockResolvedValue({ success: false, error: 'TEST_AUT_CONTROLLED' });
    await act(async () => reopened.result.current.handleEmit());
    expect(mocks.emit.mock.calls[0][0].items[0].fiscal).toMatchObject(changes);
    expect(order).toEqual(original);
  });
});
