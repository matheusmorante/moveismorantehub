// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchOrdersPage: vi.fn(),
  fetchOrdersForClientFiltering: vi.fn(),
  fetchOrderFiscalBadgeStatuses: vi.fn(),
  subscribeToOrderChanges: vi.fn(),
  autoFulfillExpiredOrders: vi.fn(),
}));

vi.mock('../../../utils/orderHistoryService', () => ({
  fetchOrdersPage: mocks.fetchOrdersPage,
  fetchOrdersForClientFiltering: mocks.fetchOrdersForClientFiltering,
  subscribeToOrderChanges: mocks.subscribeToOrderChanges,
  updateOrder: vi.fn(),
  undoReturn: vi.fn(),
}));
vi.mock('@/pages/utils/nfe/orderFiscalBadgeService', () => ({
  fetchOrderFiscalBadgeStatuses: mocks.fetchOrderFiscalBadgeStatuses,
}));
vi.mock('@/pages/utils/orderFulfillmentCountdown', () => ({
  autoFulfillExpiredOrders: mocks.autoFulfillExpiredOrders,
}));
vi.mock('../../../../hooks/useWindowSize', () => ({ useWindowSize: () => ({ width: 1440 }) }));
vi.mock('../OrderActions/orderActionsConfig', () => ({ actionsMap: {}, buttons: [] }));
vi.mock('./useOrderHistoryOperations', () => ({
  createOrderHistoryOperations: () => ({
    handleDelete: vi.fn(),
    handleRestore: vi.fn(),
    handlePermanentDelete: vi.fn(),
    handleBulkTrash: vi.fn(),
    handleBulkRestore: vi.fn(),
    handleBulkPermanentDelete: vi.fn(),
    handleBlingUpdate: vi.fn(),
    handleStockCheckUpdate: vi.fn(),
    commitStatusUpdate: vi.fn(),
    retryFiscalCancellation: vi.fn(),
  }),
}));

import { useOrderHistory } from './useOrderHistory';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useOrderHistory query state', () => {
  const createWrapper = (gcTime = 0) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime } },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('does not show the previous page while the new page query is loading', async () => {
    let resolveSecondPage!: (result: { orders: Array<{ id: string }>; total: number }) => void;
    const observedPages: Array<{ currentPage: number; orders: Array<{ id?: string }> }> = [];
    mocks.fetchOrdersPage
      .mockResolvedValueOnce({ orders: [{ id: 'order-page-1' }], total: 30 })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecondPage = resolve;
          })
      );
    mocks.fetchOrderFiscalBadgeStatuses.mockResolvedValue({});
    mocks.subscribeToOrderChanges.mockReturnValue(vi.fn());

    const { result } = renderHook(() => {
      const state = useOrderHistory();
      observedPages.push({ currentPage: state.currentPage, orders: state.orders });
      return state;
    }, { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.orders.map((order) => order.id)).toEqual(['order-page-1']));

    act(() => result.current.setCurrentPage(2));

    await waitFor(() => expect(mocks.fetchOrdersPage).toHaveBeenCalledTimes(2));
    expect(result.current.loading).toBe(true);
    expect(result.current.orders).toEqual([]);

    await act(async () => {
      resolveSecondPage({ orders: [{ id: 'order-page-2' }], total: 30 });
    });
    await waitFor(() => expect(result.current.orders.map((order) => order.id)).toEqual(['order-page-2']));

    const rendersBeforeCachedPage = observedPages.length;
    act(() => result.current.setCurrentPage(1));
    await waitFor(() => expect(result.current.orders.map((order) => order.id)).toEqual(['order-page-1']));

    const cachedPageRenders = observedPages.slice(rendersBeforeCachedPage);
    expect(
      cachedPageRenders.every(
        (snapshot) =>
          snapshot.currentPage !== 1 ||
          snapshot.orders.every((order) => order.id === 'order-page-1')
      )
    ).toBe(true);
  });

  it('reuses globally filtered candidate orders when changing pages', async () => {
    const candidates = Array.from({ length: 30 }, (_, index) => ({
      id: `filtered-order-${index + 1}`,
      date: '15/01/2025',
      orderType: 'sale',
      paymentsSummary: { totalOrderValue: 100 },
    }));
    mocks.fetchOrdersForClientFiltering.mockResolvedValue(candidates);
    mocks.fetchOrderFiscalBadgeStatuses.mockResolvedValue({});
    mocks.subscribeToOrderChanges.mockReturnValue(vi.fn());
    const filters = {
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
      valueRange: { min: 0, max: 1000 },
    };

    const { result } = renderHook(() => useOrderHistory(filters), {
      wrapper: createWrapper(5 * 60 * 1000),
    });

    await waitFor(() => expect(result.current.orders).toHaveLength(15));
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledOnce();

    act(() => result.current.setCurrentPage(2));

    await waitFor(() => expect(result.current.orders).toHaveLength(15));
    expect(result.current.orders.map((order) => order.id)).toEqual(
      candidates.slice(15).map((order) => order.id)
    );
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledOnce();
  });

  it('refresh invalida e recarrega o cache de candidatos globais', async () => {
    const firstCandidate = {
      id: 'order-before-refresh',
      date: '15/01/2025',
      orderType: 'sale',
      paymentsSummary: { totalOrderValue: 100 },
    };
    const refreshedCandidate = { ...firstCandidate, id: 'order-after-refresh' };
    mocks.fetchOrdersForClientFiltering
      .mockResolvedValueOnce([firstCandidate])
      .mockResolvedValueOnce([refreshedCandidate]);
    mocks.fetchOrderFiscalBadgeStatuses.mockResolvedValue({});
    mocks.subscribeToOrderChanges.mockReturnValue(vi.fn());
    const filters = {
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
      valueRange: { min: 0, max: 1000 },
    };

    const { result } = renderHook(() => useOrderHistory(filters), {
      wrapper: createWrapper(5 * 60 * 1000),
    });

    await waitFor(() => expect(result.current.orders[0]?.id).toBe('order-before-refresh'));
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledOnce();

    let refreshComplete!: Promise<void>;
    act(() => {
      refreshComplete = result.current.refresh();
    });

    await waitFor(() => expect(result.current.orders[0]?.id).toBe('order-after-refresh'));
    await expect(refreshComplete).resolves.toBeUndefined();
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledTimes(2);
  });

  it('resolve refresh quando a recarga termina com a mesma lista', async () => {
    const candidate = {
      id: 'unchanged-order',
      date: '15/01/2025',
      orderType: 'sale',
      paymentsSummary: { totalOrderValue: 100 },
    };
    let resolveRefreshFetch!: (orders: typeof candidate[]) => void;
    mocks.fetchOrdersForClientFiltering
      .mockResolvedValueOnce([candidate])
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefreshFetch = resolve;
          })
      );
    mocks.fetchOrderFiscalBadgeStatuses.mockResolvedValue({});
    mocks.subscribeToOrderChanges.mockReturnValue(vi.fn());
    const filters = {
      dateRange: { start: '2025-01-01', end: '2025-01-31' },
      valueRange: { min: 0, max: 1000 },
    };

    const { result } = renderHook(() => useOrderHistory(filters), {
      wrapper: createWrapper(5 * 60 * 1000),
    });

    await waitFor(() => expect(result.current.orders[0]?.id).toBe(candidate.id));
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledOnce();

    let refreshComplete!: Promise<void>;
    act(() => {
      refreshComplete = result.current.refresh();
    });

    let refreshSettled = false;
    void refreshComplete.then(() => {
      refreshSettled = true;
    });
    await waitFor(() => expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledTimes(2));
    expect(refreshSettled).toBe(false);

    await act(async () => resolveRefreshFetch([candidate]));
    await expect(refreshComplete).resolves.toBeUndefined();
    expect(result.current.orders[0]?.id).toBe(candidate.id);
    expect(mocks.fetchOrdersForClientFiltering).toHaveBeenCalledTimes(2);
  });

  it('volta à última página válida quando o total diminui após refresh', async () => {
    let total = 16;
    const createPage = (page: number) => {
      const start = (page - 1) * 15;
      return Array.from({ length: Math.max(0, Math.min(15, total - start)) }, (_, index) => ({
        id: `order-${start + index + 1}`,
      }));
    };
    mocks.fetchOrdersPage.mockImplementation(async (page: number) => ({
      orders: createPage(page),
      total,
    }));
    mocks.fetchOrderFiscalBadgeStatuses.mockResolvedValue({});
    mocks.subscribeToOrderChanges.mockReturnValue(vi.fn());

    const { result } = renderHook(() => useOrderHistory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.totalItems).toBe(16));
    act(() => result.current.setCurrentPage(2));
    await waitFor(() => expect(result.current.currentPage).toBe(2));
    await waitFor(() => expect(result.current.orders.map((order) => order.id)).toEqual(['order-16']));

    total = 5;
    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.currentPage).toBe(1);
      expect(result.current.totalItems).toBe(5);
      expect(result.current.orders).toHaveLength(5);
    });
    expect(result.current.orders[0]?.id).toBe('order-1');
  });
});
