// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNextOrderIndex } from '@/pages/utils/orderCode';
import { useOrderCodeGenerator } from './useOrderCodeGenerator';

vi.mock('@/pages/utils/orderCode', () => ({ getNextOrderIndex: vi.fn() }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn() } }));

afterEach(() => vi.clearAllMocks());

describe('reserva de código durante a edição de pedido', () => {
  it('não substitui o código de um rascunho carregado enquanto a reserva inicial termina', async () => {
    let finish!: (code: number) => void;
    vi.mocked(getNextOrderIndex).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const latest = { current: { currentOrderId: undefined, orderIndex: null } } as any;
    const { result, rerender } = renderHook(
      ({ id }) => useOrderCodeGenerator(id, latest),
      { initialProps: { id: undefined as string | undefined } }
    );
    act(() => {
      latest.current.currentOrderId = 'rascunho-existente';
      latest.current.orderIndex = 1201;
      result.current.setOrderIndex(1201);
      rerender({ id: 'rascunho-existente' });
    });
    await act(async () => { finish(1202); });
    expect(result.current.orderIndex).toBe(1201);
    expect(latest.current.orderIndex).toBe(1201);
  });

  it('não substitui o código de outro rascunho durante uma reserva solicitada pelo autosave', async () => {
    let finish!: (code: number) => void;
    vi.mocked(getNextOrderIndex).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const latest = { current: { currentOrderId: undefined, orderIndex: null } } as any;
    const { result, rerender } = renderHook(
      ({ id }) => useOrderCodeGenerator(id, latest),
      { initialProps: { id: undefined as string | undefined } }
    );
    let pending!: Promise<number | null>;
    await act(async () => { pending = result.current.ensureOrderCode(); });
    act(() => {
      latest.current.currentOrderId = 'outro-rascunho';
      latest.current.orderIndex = 1201;
      result.current.setOrderIndex(1201);
      rerender({ id: 'outro-rascunho' });
    });
    await act(async () => { finish(1202); expect(await pending).toBeNull(); });
    expect(result.current.orderIndex).toBe(1201);
    expect(latest.current.orderIndex).toBe(1201);
  });
});
