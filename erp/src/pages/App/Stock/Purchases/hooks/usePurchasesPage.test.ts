// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), subscribe: vi.fn() }));
vi.mock('@/pages/utils/purchasePageService', () => ({
  fetchPurchasesPage: mocks.fetch,
  subscribeToPurchasePageChanges: mocks.subscribe,
}));
import { usePurchasesPage } from './usePurchasesPage';

const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => { resolve = done; });
  return { promise, resolve };
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.subscribe.mockReturnValue(vi.fn());
});
afterEach(cleanup);

describe('estado da página de compras', () => {
  it('cancela o pedido antigo e descarta respostas de outro fornecedor ou conta', async () => {
    const first = deferred();
    const next = deferred();
    mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(
      ({ supplier, user }) => usePurchasesPage(1, supplier, user),
      { initialProps: { supplier: 'supplier-a', user: 'user-a' } },
    );
    const oldSignal = mocks.fetch.mock.calls[0][1].signal as AbortSignal;
    rerender({ supplier: 'supplier-b', user: 'user-b' });
    expect(oldSignal.aborted).toBe(true);
    expect(result.current.purchases).toEqual([]);
    await act(async () => next.resolve({ data: [{ id: 'current-purchase' }], total: 1 }));
    await act(async () => first.resolve({ data: [{ id: 'old-purchase' }], total: 99 }));
    expect(result.current.purchases.map((purchase) => purchase.id)).toEqual(['current-purchase']);
    expect(result.current.total).toBe(1);
  });

  it('mantém a última página se a atualização falhar e permite tentar novamente', async () => {
    let refresh = () => undefined;
    mocks.subscribe.mockImplementation((callback) => { refresh = callback; return vi.fn(); });
    mocks.fetch
      .mockResolvedValueOnce({ data: [{ id: 'saved-page' }], total: 1 })
      .mockRejectedValueOnce(new Error('connection lost'))
      .mockResolvedValueOnce({ data: [{ id: 'updated-page' }], total: 1 });
    const { result } = renderHook(() => usePurchasesPage(1, '', 'user-a'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => refresh());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.purchases.map((purchase) => purchase.id)).toEqual(['saved-page']);
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.purchases[0]?.id).toBe('updated-page'));
    expect(result.current.error).toBeNull();
  });
});
