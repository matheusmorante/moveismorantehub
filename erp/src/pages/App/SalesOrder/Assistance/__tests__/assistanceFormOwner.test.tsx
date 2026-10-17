// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ save: vi.fn(), subscribe: vi.fn(), fetch: vi.fn(), settings: vi.fn() }));
vi.mock('@/pages/utils/orderHistoryService', () => ({ saveOrder: mocks.save, subscribeToOrders: mocks.subscribe, fetchOrderById: mocks.fetch }));
vi.mock('@/pages/utils/settingsService', () => ({ getSettings: mocks.settings }));
vi.mock('react-toastify', () => ({ toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() } }));
import { useAssistanceOrderForm } from '../hooks/useAssistanceOrderForm';
const customer = { fullName: 'Cliente', phone: '', noPhone: true };
const source = { id: 'sale-1', status: 'fulfilled', orderType: 'sale', customerData: customer, items: [] } as any;
const draft = { id: 'ast-1', status: 'draft', orderType: 'assistance', customerData: customer, items: [], assistanceDescription: 'Descrição' } as any;
const pending = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; };
beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); mocks.subscribe.mockImplementation(callback => { callback([]); return vi.fn(); }); mocks.settings.mockReturnValue({ requiredFields: {} }); mocks.fetch.mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const submit = async (result: { current: ReturnType<typeof useAssistanceOrderForm> }) => { await act(async () => { result.current.handleSave({ preventDefault: vi.fn() } as any); }); };

describe('proprietário da assistência', () => {
  it('não repete gravação final durante uma gravação pendente', async () => {
    const save = pending<string>(); mocks.save.mockReturnValue(save.promise); const onClose = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose, onSaveSuccess: vi.fn() }));
    await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1); await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { save.resolve('ast-1'); });
  });

  it('bloqueia quantidade inválida dos itens vinculados antes de salvar', async () => {
    mocks.save.mockResolvedValue('ast-1');
    const order = { ...draft, linkedOrderId: 'sale-1', assistanceItems: [{ id: 'i-1', description: 'Sofá', quantity: -1, originalOrderId: 'sale-1' }] };
    const { result } = renderHook(() => useAssistanceOrderForm({ order, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await submit(result); expect(mocks.save).not.toHaveBeenCalled();
  });

  it('aguarda autosave e finaliza com o ID confirmado sem perder a intenção manual', async () => {
    const save = pending<string>(); mocks.save.mockReturnValueOnce(save.promise).mockResolvedValue('ast-new'); const onClose = vi.fn(); const onSaveSuccess = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ sourceOrder: source, onClose, onSaveSuccess }));
    await act(async () => { vi.advanceTimersByTime(2000); }); expect(mocks.save).toHaveBeenCalledTimes(1);
    act(() => { result.current.setDescription('Consertar tecido'); result.current.setExtraItems([{ productId: 'p-1', description: 'Peça', quantity: 1, unitPrice: 10 }] as any); });
    await submit(result); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { save.resolve('ast-new'); });
    expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.save.mock.calls[1][0]).toMatchObject({ id: 'ast-new', status: 'fulfilled', assistanceDescription: 'Consertar tecido' }); expect(onSaveSuccess).toHaveBeenCalledTimes(1);
  });

  it('bloqueia handleClose enquanto houver gravação em andamento e libera após conclusão', async () => {
    const save = pending<string>(); mocks.save.mockReturnValue(save.promise); const onClose = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose, onSaveSuccess: vi.fn() }));
    let submitPromise!: Promise<any>;
    act(() => {
      submitPromise = result.current.handleSave({ preventDefault: vi.fn() } as any);
    });
    expect(result.current.loading).toBe(true);
    act(() => { result.current.handleClose(); });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => {
      save.resolve('ast-1');
      await submitPromise;
    });
    expect(result.current.loading).toBe(false);
  });

  it('bloqueia nova tentativa após falha incerta de rede durante o salvamento', async () => {
    mocks.save.mockRejectedValue(new Error('Network drop timeout'));
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await submit(result);
    expect(result.current.saveBlocked).toBe(true);
    expect(result.current.operationError).toContain('Confira o histórico antes de repetir.');
    await submit(result);
    // Não deve chamar saveOrder novamente devido ao bloqueio de incerteza
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});

