// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOrder } from '@/pages/utils/orderHistoryService';
import { useOrderAutoSave } from './useOrderAutoSave';

vi.mock('@/pages/utils/orderHistoryService', () => ({ saveOrder: vi.fn() }));

const emptyItems = [{ description: '', unitPrice: 0 }] as any;
const changedItems = [{ description: 'Mesa lateral', unitPrice: 250 }] as any;
const latestChangedItems = [{ description: 'Mesa lateral', unitPrice: 275 }] as any;
const shipping = { value: 0, scheduling: { date: '', notInformed: false } } as any;
const payments = [{ amount: 0 }] as any;
const customerData = {
  fullName: '',
  phone: '',
  fullAddress: { street: '', cep: '' },
} as any;

function renderAutoSave(isDraftAutoSaveEnabled = true) {
  const latestStateRef = {
    current: {
      orderIndex: 1201,
      currentOrderId: undefined,
      status: 'draft',
      isSaving: false,
      items: emptyItems,
    },
  } as any;
  const getOrderData = vi.fn(
    (status?: string) => ({ status, items: latestStateRef.current.items }) as any
  );
  const setCurrentOrderId = vi.fn((id?: string) => {
    latestStateRef.current.currentOrderId = id;
  });

  const hook = renderHook(({ items }) => {
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
      1201,
      getOrderData,
      setCurrentOrderId,
      latestStateRef,
      isDraftAutoSaveEnabled
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
    expect(result.current.draftAutoSaveStatus).toBe('pending');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(result.current.draftAutoSaveStatus).toBe('saving');

    resolveLatestSave('draft-123');
    await act(async () => {
      await latestSave;
    });

    expect(result.current.draftAutoSaveStatus).toBe('saved');
    expect(saveOrder).toHaveBeenCalledTimes(2);
    expect(vi.mocked(saveOrder).mock.calls[1][0].items).toBe(latestChangedItems);
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
});
