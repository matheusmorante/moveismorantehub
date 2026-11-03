// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: 'user-a',
  role: 'administrator',
  onChange: undefined as (() => void) | undefined,
  onItemChange: undefined as (() => void) | undefined,
  onItemStatus: undefined as ((status: string) => void) | undefined,
  period: vi.fn(),
  scheduled: vi.fn(),
  recent: vi.fn(),
  geo: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: mocks.userId }, profile: { id: mocks.userId, role: mocks.role } }),
}));
vi.mock('../../../utils/orderHistoryService', () => ({
  fetchAllOrdersForDashboard: mocks.period,
  fetchScheduledAndDraftOrders: mocks.scheduled,
  fetchRecentOrders: mocks.recent,
  fetchGeoMapOrders: mocks.geo,
}));
vi.mock('../../../utils/hmlTestData', () => ({ isHmlFiscalTestOrder: () => false }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { channel: mocks.channel, removeChannel: mocks.removeChannel, rpc: mocks.rpc } }));

import { useDashboardQueries } from './useDashboardQueries';

const first = { start: new Date('2026-09-01T00:00:00Z'), end: new Date('2026-09-30T23:59:59Z') };
const second = { start: new Date('2026-10-01T00:00:00Z'), end: new Date('2026-10-31T23:59:59Z') };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

function confirmRealtimeSubscription() {
  act(() => mocks.onItemStatus?.('SUBSCRIBED'));
}

beforeEach(() => {
  mocks.userId = 'user-a';
  mocks.role = 'administrator';
  mocks.onChange = undefined;
  mocks.onItemChange = undefined;
  mocks.onItemStatus = undefined;
  mocks.period.mockReset().mockImplementation(async ({ start }: { start: Date }) => [{ id: `${mocks.userId}:${start.toISOString()}` }]);
  mocks.scheduled.mockReset().mockResolvedValue([]);
  mocks.recent.mockReset().mockResolvedValue([]);
  mocks.geo.mockReset().mockResolvedValue([]);
  mocks.channel.mockReset().mockImplementation(() => {
    const channel: any = {};
    channel.on = vi.fn((_event: string, filter: { table: string }, callback: () => void) => {
      if (filter.table === 'orders') mocks.onChange = callback;
      if (filter.table === 'order_items') mocks.onItemChange = callback;
      return channel;
    });
    channel.subscribe = vi.fn((callback: (status: string) => void) => {
      mocks.onItemStatus = callback;
      return channel;
    });
    return channel;
  });
  mocks.removeChannel.mockReset().mockResolvedValue(undefined);
  mocks.rpc.mockReset().mockResolvedValue({ data: { ready: false }, error: null });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('cache das consultas do Dashboard', () => {
  it('reutiliza os painéis independentes e o período já visitado', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ range }) => useDashboardQueries(range.start, range.end), {
      initialProps: { range: first }, wrapper,
    });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    rerender({ range: second });
    await waitFor(() => expect(result.current.orders[0]?.id).toContain(second.start.toISOString()));
    rerender({ range: first });
    await waitFor(() => expect(result.current.orders[0]?.id).toContain(first.start.toISOString()));
    expect(mocks.period).toHaveBeenCalledTimes(2);
    expect(mocks.scheduled).toHaveBeenCalledTimes(1);
    expect(mocks.recent).toHaveBeenCalledTimes(1);
    expect(mocks.geo).toHaveBeenCalledTimes(1);
  });

  it('invalida períodos e painéis após mudança de pedido e descarta resposta antiga em voo', async () => {
    const { wrapper } = setup();
    let finishOld!: (value: { id: string }[]) => void;
    mocks.period.mockResolvedValueOnce([{ id: 'original' }])
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce([{ id: 'atualizado' }]);
    const { result } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders[0]?.id).toBe('original'));
    act(() => mocks.onChange?.());
    await waitFor(() => expect(mocks.period).toHaveBeenCalledTimes(2));
    act(() => mocks.onChange?.());
    await waitFor(() => expect(result.current.orders[0]?.id).toBe('atualizado'));
    await act(async () => finishOld([{ id: 'obsoleto' }]));
    expect(result.current.orders[0]?.id).toBe('atualizado');
    expect(mocks.scheduled).toHaveBeenCalledTimes(3);
  });

  it('evita duplicar a leitura inicial e invalida após alterações e reconexão', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    expect(mocks.period).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    expect(mocks.period).toHaveBeenCalledTimes(1);
    act(() => {
      mocks.onItemChange?.();
      mocks.onChange?.();
    });
    await waitFor(() => expect(mocks.period).toHaveBeenCalledTimes(2));
    act(() => {
      mocks.onItemStatus?.('CHANNEL_ERROR');
      mocks.onItemStatus?.('SUBSCRIBED');
    });
    await waitFor(() => expect(mocks.period).toHaveBeenCalledTimes(3));
  });

  it('libera as consultas após o failsafe e revalida se a assinatura chegar tarde', async () => {
    vi.useFakeTimers();
    try {
      const { wrapper } = setup();
      const { result } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
      await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
      expect(mocks.period).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(true);

      await act(async () => {
        mocks.onItemStatus?.('SUBSCRIBED');
        await vi.advanceTimersByTimeAsync(150);
      });
      expect(mocks.period).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('consulta e invalida o consolidado junto dos períodos correspondentes', async () => {
    mocks.rpc.mockResolvedValue({ data: { ready: true, current: { totalSales: 10, saleCount: 1, paidTrafficSalesValue: 0 }, previous: { totalSales: 0, saleCount: 0, paidTrafficSalesValue: 0 } }, error: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first.start, second.end, second.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.salesRollup?.current.totalSales).toBe(10));
    expect(mocks.rpc).toHaveBeenCalledWith('get_dashboard_sales_summary', {
      p_current_start: second.start.toISOString(), p_current_end: second.end.toISOString(),
      p_previous_start: first.start.toISOString(), p_previous_end: first.end.toISOString(),
    });
    act(() => mocks.onChange?.());
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
  });

  it('disponibiliza o consolidado antes dos pedidos detalhados', async () => {
    let finishPeriod!: (value: { id: string }[]) => void;
    mocks.period.mockImplementationOnce(() => new Promise((resolve) => { finishPeriod = resolve; }));
    mocks.rpc.mockResolvedValue({ data: { ready: true, current: { totalSales: 10, saleCount: 1, paidTrafficSalesValue: 0 }, previous: { totalSales: 0, saleCount: 0, paidTrafficSalesValue: 0 } }, error: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first.start, second.end, second.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.salesRollup?.current.totalSales).toBe(10));
    expect(result.current.salesSummaryLoading).toBe(false);
    expect(result.current.loading).toBe(true);
    await act(async () => finishPeriod([{ id: 'pedido' }]));
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('sinaliza falha de leitura em vez de tratar a lista vazia como sucesso e permite tentar novamente', async () => {
    mocks.period.mockRejectedValueOnce(new Error('leitura indisponível'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.ordersQueryError).toBe(true));
    expect(result.current.orders).toEqual([]);

    await act(async () => { await result.current.retryOrderQueries(); });
    await waitFor(() => expect(result.current.ordersQueryError).toBe(false));
    expect(result.current.orders).toHaveLength(1);
  });

  it('isola os dados pela identidade autenticada', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders[0]?.id).toContain('user-a'));
    mocks.userId = 'user-b';
    rerender();
    await waitFor(() => expect(mocks.channel).toHaveBeenCalledTimes(2));
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders[0]?.id).toContain('user-b'));
    expect(mocks.period).toHaveBeenCalledTimes(2);
  });

  it('não reutiliza dados de outro papel efetivo do mesmo usuário', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    mocks.role = 'manager';
    mocks.period.mockResolvedValue([{ id: 'escopo-gerente' }]);
    rerender();
    await waitFor(() => expect(mocks.channel).toHaveBeenCalledTimes(2));
    confirmRealtimeSubscription();
    await waitFor(() => expect(result.current.orders[0]?.id).toBe('escopo-gerente'));
    expect(mocks.period).toHaveBeenCalledTimes(2);
  });

  it('revalida o cache ao retornar à tela', async () => {
    const { wrapper } = setup();
    const firstMount = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(firstMount.result.current.orders).toHaveLength(1));
    firstMount.unmount();
    mocks.period.mockResolvedValue([{ id: 'apos-retorno' }]);
    const nextMount = renderHook(() => useDashboardQueries(first.start, first.end), { wrapper });
    confirmRealtimeSubscription();
    await waitFor(() => expect(nextMount.result.current.orders[0]?.id).toBe('apos-retorno'));
    expect(mocks.period).toHaveBeenCalledTimes(2);
  });
});
