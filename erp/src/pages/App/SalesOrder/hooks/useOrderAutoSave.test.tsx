// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOrder } from '@/pages/utils/orderHistoryService';
import { useOrderAutoSave } from './useOrderAutoSave';

vi.mock('@/pages/utils/orderHistoryService', () => ({ saveOrder: vi.fn() }));

const emptyItems = [{ description: '', unitPrice: 0, quantity: 1 }] as any;
const changedItems = [{ description: 'Mesa lateral', unitPrice: 250, quantity: 1 }] as any;
const latestChangedItems = [{ description: 'Mesa lateral', unitPrice: 275, quantity: 1 }] as any;
const shipping = { value: 0, scheduling: { date: '', notInformed: false } } as any;
const payments = [{ amount: 0 }] as any;
const customerData = {
  fullName: '',
  phone: '',
  fullAddress: { street: '', cep: '' },
} as any;

function renderAutoSave(
  isDraftAutoSaveEnabled = true,
  orderIndex: number | null = 1201,
  ensureOrderCode?: () => Promise<number | null>
) {
  const latestStateRef = {
    current: {
      orderIndex,
      currentOrderId: undefined,
      status: 'draft',
      isSaving: false,
      items: emptyItems,
    },
  } as any;
  const getOrderData = vi.fn(
    (status?: string) => ({ id: latestStateRef.current.currentOrderId, status, date: '2026-09-30', seller: '', items: latestStateRef.current.items }) as any
  );
  const setCurrentOrderId = vi.fn((id?: string) => {
    latestStateRef.current.currentOrderId = id;
  });

  const hook = renderHook(
    ({ items }) => {
      latestStateRef.current.items = items;
      return useOrderAutoSave(
        items,
        shipping,
        payments,
        customerData,
        '',
        '',
        'organic',
        '2026-09-30',
        'draft',
        orderIndex,
        getOrderData,
        setCurrentOrderId,
        latestStateRef,
        isDraftAutoSaveEnabled,
        undefined,
        undefined,
        ensureOrderCode
      );
    },
    { initialProps: { items: emptyItems } }
  );

  return { ...hook, latestStateRef, getOrderData, setCurrentOrderId };
}

describe('useOrderAutoSave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(saveOrder).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mostra o ciclo pendente, salvando e salvo apenas após confirmação da persistência', async () => {
    let resolveSave!: (id: string) => void;
    const savePromise = new Promise<string>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(saveOrder).mockReturnValue(savePromise);

    const { result, rerender, setCurrentOrderId } = renderAutoSave();
    rerender({ items: changedItems });

    expect(result.current.draftAutoSaveStatus).toBe('pending');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.draftAutoSaveStatus).toBe('saving');

    await act(async () => {
      resolveSave('draft-123');
      await savePromise;
    });

    expect(result.current.draftAutoSaveStatus).toBe('saved');
    expect(setCurrentOrderId).toHaveBeenCalledWith('draft-123');
    expect(saveOrder).toHaveBeenCalledTimes(1);
  });

  it('não executa nem sinaliza autosave quando o formulário está em modo de edição', async () => {
    const { result, rerender } = renderAutoSave(false);
    rerender({ items: changedItems });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(saveOrder).not.toHaveBeenCalled();
    expect(result.current.draftAutoSaveStatus).toBe('idle');
  });

  it('obtém o código pendente e salva a alteração automaticamente', async () => {
    vi.mocked(saveOrder).mockResolvedValue('draft-123');
    let latestStateRef: ReturnType<typeof renderAutoSave>['latestStateRef'];
    const ensureOrderCode = vi.fn(async () => {
      latestStateRef.current.orderIndex = 1201;
      return 1201;
    });
    const hook = renderAutoSave(true, null, ensureOrderCode);
    latestStateRef = hook.latestStateRef;
    hook.rerender({ items: changedItems });

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(ensureOrderCode).toHaveBeenCalledOnce();
    expect(saveOrder).toHaveBeenCalledOnce();
    expect(hook.result.current.draftAutoSaveStatus).toBe('saved');
  });

  it('mostra falha quando não consegue obter o código do rascunho', async () => {
    const ensureOrderCode = vi.fn().mockResolvedValue(null);
    const { result, rerender } = renderAutoSave(true, null, ensureOrderCode);
    rerender({ items: changedItems });

    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(ensureOrderCode).toHaveBeenCalledOnce();
    expect(saveOrder).not.toHaveBeenCalled();
    expect(result.current.draftAutoSaveStatus).toBe('error');
  });

  it('avisa quando a confirmação demora sem iniciar uma gravação duplicada', async () => {
    let finish!: (value: string) => void;
    vi.mocked(saveOrder).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderAutoSave();
    rerender({ items: changedItems });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(result.current.draftAutoSaveStatus).toBe('saving');

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(result.current.draftAutoSaveStatus).toBe('error');
    expect(saveOrder).toHaveBeenCalledOnce();

    await act(async () => { finish('draft-123'); });
    expect(result.current.draftAutoSaveStatus).toBe('saved');
    expect(saveOrder).toHaveBeenCalledOnce();
  });

  it('aguarda uma gravação em andamento e confirma somente a alteração mais recente', async () => {
    let resolveFirstSave!: (id: string) => void;
    let resolveLatestSave!: (id: string) => void;
    const firstSave = new Promise<string>((resolve) => {
      resolveFirstSave = resolve;
    });
    const latestSave = new Promise<string>((resolve) => {
      resolveLatestSave = resolve;
    });
    vi.mocked(saveOrder).mockReturnValueOnce(firstSave).mockReturnValueOnce(latestSave);

    const { result, rerender } = renderAutoSave();
    rerender({ items: changedItems });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.draftAutoSaveStatus).toBe('saving');

    rerender({ items: latestChangedItems });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    resolveFirstSave('draft-123');
    await act(async () => {
      await firstSave;
    });
    expect(result.current.draftAutoSaveStatus).toBe('saving');

    resolveLatestSave('draft-123');
    await act(async () => {
      await latestSave;
    });

    expect(result.current.draftAutoSaveStatus).toBe('saved');
    expect(saveOrder).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveOrder).mock.calls[1][0].items).toMatchObject(latestChangedItems);
    expect(vi.mocked(saveOrder).mock.calls[1][0].id).toBe('draft-123');
  });

  it('permite aguardar a persistência do autosave antes de concluir o cadastro', async () => {
    let resolveSave!: (id: string) => void;
    const savePromise = new Promise<string>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(saveOrder).mockReturnValue(savePromise);

    const { result, rerender, latestStateRef } = renderAutoSave();
    rerender({ items: changedItems });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    let waitResolved = false;
    const waitPromise = result.current.waitForActiveSave().then(() => {
      waitResolved = true;
    });
    await Promise.resolve();
    expect(waitResolved).toBe(false);

    await act(async () => {
      resolveSave('draft-123');
      await savePromise;
      await waitPromise;
    });

    expect(waitResolved).toBe(true);
    expect(latestStateRef.current.currentOrderId).toBe('draft-123');
  });

  it('não mostra confirmação verde quando a gravação falha', async () => {
    vi.mocked(saveOrder).mockRejectedValueOnce(new Error('offline'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender } = renderAutoSave();
    rerender({ items: changedItems });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.draftAutoSaveStatus).toBe('error');
    expect(saveOrder).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });

  it('não persiste números inválidos e sinaliza falha sem descartar o preenchimento', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, rerender, setCurrentOrderId } = renderAutoSave();
    rerender({ items: [{ ...changedItems[0], quantity: NaN }] });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(saveOrder).not.toHaveBeenCalled(); expect(setCurrentOrderId).not.toHaveBeenCalled(); expect(result.current.draftAutoSaveStatus).toBe('error');
    consoleError.mockRestore();
  });

  it('entrega os valores parseados de um rascunho incompleto ao serviço', async () => {
    vi.mocked(saveOrder).mockResolvedValue('draft-123'); const { rerender } = renderAutoSave();
    rerender({ items: changedItems }); await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(saveOrder).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', seller: '', orderType: 'sale', items: [expect.objectContaining({ unitDiscount: 0, discountType: 'fixed' })] }), expect.objectContaining({ idempotencyKey: expect.any(String) }));
  });

  it('cancela o efeito agendado quando a submissão manual já assumiu a operação', async () => {
    const { result, rerender, latestStateRef } = renderAutoSave(); rerender({ items: changedItems });
    latestStateRef.current.submissionInFlight = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(saveOrder).not.toHaveBeenCalled(); expect(result.current.draftAutoSaveStatus).toBe('idle');
  });
});
