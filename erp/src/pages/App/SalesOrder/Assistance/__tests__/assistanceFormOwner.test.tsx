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
    mocks.save.mockResolvedValue('ast-1'); mocks.fetch.mockResolvedValue(source);
    const order = { ...draft, linkedOrderId: 'sale-1', assistanceItems: [{ id: 'i-1', description: 'Sofá', quantity: -1, originalOrderId: 'sale-1' }] };
    const { result } = renderHook(() => useAssistanceOrderForm({ order, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await act(async () => {});
    await submit(result); expect(mocks.save).not.toHaveBeenCalled();
    expect(result.current.validationErrors).toHaveProperty('assistanceItems_0_quantity');
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

  it('consulta o vínculo com o ID parseado e resolve seu carregamento', async () => {
    mocks.fetch.mockResolvedValue(source);
    const { result } = renderHook(() => useAssistanceOrderForm({ order: { ...draft, linkedOrderId: ' sale-1 ' }, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await act(async () => {});
    expect(mocks.fetch).toHaveBeenCalledWith('sale-1'); expect(result.current.currentLinkedOrder?.id).toBe('sale-1'); expect(result.current.linkedOrderLoading).toBe(false);
  });

  it('bloqueia vínculo vazio no resolver antes de consultar o serviço', async () => {
    const { result } = renderHook(() => useAssistanceOrderForm({ order: { ...draft, linkedOrderId: '   ' }, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await act(async () => {}); expect(mocks.fetch).not.toHaveBeenCalled(); expect(result.current.linkedOrderError).toContain('Identifique a venda'); expect(result.current.linkedOrderLoading).toBe(false);
  });

  it('limita a consulta, descarta resposta tardia e permite nova leitura', async () => {
    const read = pending<any>(); mocks.fetch.mockReturnValueOnce(read.promise).mockResolvedValue(source);
    const { result } = renderHook(() => useAssistanceOrderForm({ order: { ...draft, linkedOrderId: 'sale-1' }, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await act(async () => {}); await act(async () => { vi.advanceTimersByTime(15000); });
    expect(result.current.linkedOrderLoading).toBe(false); expect(result.current.linkedOrderError).toBeTruthy();
    await submit(result); expect(mocks.save).not.toHaveBeenCalled();
    await act(async () => { read.resolve(source); }); expect(result.current.currentLinkedOrder).toBeUndefined();
    await act(async () => { result.current.retryLinkedOrder(); });
    expect(result.current.currentLinkedOrder?.id).toBe('sale-1'); expect(result.current.linkedOrderError).toBe('');
  });

  it('mantém a submissão ativa até o callback do painel confirmar', async () => {
    const callback = pending<boolean>(); mocks.save.mockResolvedValue('ast-1'); const onClose = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose, onSaveSuccess: vi.fn(() => callback.promise) }));
    await submit(result); expect(result.current.loading).toBe(true); expect(result.current.hasSavedFinal).toBe(true);
    act(() => { result.current.handleClose(); }); expect(onClose).not.toHaveBeenCalled();
    await act(async () => { callback.resolve(true); }); expect(onClose).toHaveBeenCalledTimes(1); expect(result.current.loading).toBe(false);
  });

  it('repete somente o callback após confirmação de gravação e falha do painel', async () => {
    mocks.save.mockResolvedValue('ast-1'); const onClose = vi.fn(); const onSaveSuccess = vi.fn().mockRejectedValueOnce(new Error('Painel indisponível')).mockResolvedValue(true);
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose, onSaveSuccess }));
    await submit(result); expect(result.current.operationError).toContain('Assistência já gravada'); expect(result.current.hasSavedFinal).toBe(true);
    await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1); expect(onSaveSuccess).toHaveBeenCalledTimes(2); expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSaveSuccess.mock.calls[1]).toEqual(['ast-1', expect.objectContaining({ id: 'ast-1', status: 'fulfilled' })]);
  });

  it('o prazo do callback não permite reenviar a gravação já confirmada', async () => {
    mocks.save.mockResolvedValue('ast-1'); const callback = pending<boolean>(); const onSaveSuccess = vi.fn().mockReturnValueOnce(callback.promise).mockResolvedValue(true);
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose: vi.fn(), onSaveSuccess }));
    await submit(result); await act(async () => { vi.advanceTimersByTime(15000); }); expect(result.current.loading).toBe(false); expect(result.current.operationError).toContain('já foi gravada');
    await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1); expect(onSaveSuccess).toHaveBeenCalledTimes(2); await act(async () => { callback.resolve(true); });
  });

  it('bloqueia retorno comercial incerto e não aplica ID tardio', async () => {
    const save = pending<string>(); mocks.save.mockReturnValue(save.promise); const onSaveSuccess = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose: vi.fn(), onSaveSuccess }));
    await submit(result); await act(async () => { vi.advanceTimersByTime(30000); });
    expect(result.current.saveBlocked).toBe(true); expect(result.current.loading).toBe(false); await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1);
    await act(async () => { save.resolve('ast-1'); }); expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it.each(['', 'another-id'])('recusa um ID de gravação incompatível: %s', async savedId => {
    mocks.save.mockResolvedValue(savedId); const onSaveSuccess = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ order: draft, onClose: vi.fn(), onSaveSuccess })); await submit(result);
    expect(result.current.saveBlocked).toBe(true); expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it('preserva edições posteriores e salva só o rascunho mais recente da fila', async () => {
    const first = pending<string>(); mocks.save.mockReturnValueOnce(first.promise).mockResolvedValue('ast-new'); const onSaveSuccess = vi.fn();
    const { result } = renderHook(() => useAssistanceOrderForm({ sourceOrder: source, onClose: vi.fn(), onSaveSuccess }));
    await act(async () => { vi.advanceTimersByTime(2000); });
    act(() => { result.current.setDescription('Versão A'); }); await act(async () => { vi.advanceTimersByTime(2000); });
    act(() => { result.current.setDescription('Versão B'); }); await act(async () => { vi.advanceTimersByTime(2000); });
    await act(async () => { first.resolve('ast-new'); });
    expect(mocks.save).toHaveBeenCalledTimes(2); expect(mocks.save.mock.calls[1][0]).toMatchObject({ id: 'ast-new', status: 'draft', assistanceDescription: 'Versão B' }); expect(result.current.description).toBe('Versão B');
    expect(mocks.save.mock.calls[0][1].idempotencyKey).toBe(mocks.save.mock.calls[1][1].idempotencyKey);
    await act(async () => { vi.advanceTimersByTime(20000); }); expect(mocks.save).toHaveBeenCalledTimes(2); expect(onSaveSuccess).not.toHaveBeenCalled();
  });

  it('aceita rascunho incompleto e impede finalizar o mesmo conteúdo sem descrição e itens', async () => {
    mocks.save.mockResolvedValue('ast-new'); const { result } = renderHook(() => useAssistanceOrderForm({ sourceOrder: source, onClose: vi.fn(), onSaveSuccess: vi.fn() }));
    await act(async () => { vi.advanceTimersByTime(2000); }); expect(mocks.save.mock.calls[0][0].status).toBe('draft');
    await submit(result); expect(mocks.save).toHaveBeenCalledTimes(1); expect(result.current.validationErrors).toHaveProperty('assistanceDescription'); expect(result.current.validationErrors).toHaveProperty('items_summary');
  });
});

