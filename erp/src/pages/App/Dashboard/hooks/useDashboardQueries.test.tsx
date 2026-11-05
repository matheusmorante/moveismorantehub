// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userId: 'user-a', role: 'administrator',
  onChange: undefined as (() => void) | undefined,
  onItemChange: undefined as (() => void) | undefined,
  onStatus: undefined as ((status: string) => void) | undefined,
  metrics: vi.fn(), recent: vi.fn(), geo: vi.fn(), channel: vi.fn(), removeChannel: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: mocks.userId }, profile: { id: mocks.userId, role: mocks.role } }),
}));
vi.mock('../../../utils/orderHistoryService', () => ({
  fetchRecentOrders: mocks.recent, fetchGeoMapOrders: mocks.geo,
}));
vi.mock('../dashboardMetrics', () => ({ fetchDashboardMetrics: mocks.metrics }));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { channel: mocks.channel, removeChannel: mocks.removeChannel },
}));
import { useDashboardQueries } from './useDashboardQueries';
import type { DashboardMetrics, DashboardMetricsRange } from '../dashboardMetrics';

const first: DashboardMetricsRange = {
  previousStart: new Date('2026-09-01T00:00:00Z'), previousEnd: new Date('2026-09-30T23:59:59Z'),
  currentStart: new Date('2026-10-01T00:00:00Z'), currentEnd: new Date('2026-10-31T23:59:59Z'),
  bucket: 'day', timezone: 'America/Sao_Paulo',
};
const second = { ...first, currentEnd: new Date('2026-11-01T23:59:59Z') };
const snapshot = (sales: number) => ({ current: { totalSales: sales } } as DashboardMetrics);
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
const subscribe = () => act(() => mocks.onStatus?.('SUBSCRIBED'));
beforeEach(() => {
  mocks.userId = 'user-a'; mocks.role = 'administrator';
  mocks.metrics.mockReset().mockResolvedValue(snapshot(10));
  mocks.recent.mockReset().mockResolvedValue([]);
  mocks.geo.mockReset().mockResolvedValue([]);
  mocks.removeChannel.mockReset().mockResolvedValue(undefined);
  mocks.channel.mockReset().mockImplementation(() => {
    const channel: any = {};
    channel.on = vi.fn((_event, filter, callback) => {
      if (filter.table === 'orders') mocks.onChange = callback;
      if (filter.table === 'order_items') mocks.onItemChange = callback;
      return channel;
    });
    channel.subscribe = vi.fn((callback) => { mocks.onStatus = callback; return channel; });
    return channel;
  });
});
afterEach(() => { cleanup(); focusManager.setFocused(undefined); vi.useRealTimers(); });

describe('consultas compactas do Dashboard', () => {
  it('faz uma leitura agregada inicial e reutiliza períodos e painéis independentes', async () => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(({ range }) => useDashboardQueries(range), { initialProps: { range: first }, wrapper });
    expect(mocks.metrics).not.toHaveBeenCalled();
    subscribe();
    await waitFor(() => expect(result.current.metrics?.current.totalSales).toBe(10));
    expect(mocks.metrics).toHaveBeenCalledWith(first, expect.any(AbortSignal));
    rerender({ range: second });
    await waitFor(() => expect(mocks.metrics).toHaveBeenCalledTimes(2));
    rerender({ range: first });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.metrics).toHaveBeenCalledTimes(2);
    expect(mocks.recent).toHaveBeenCalledTimes(1);
    expect(mocks.geo).toHaveBeenCalledTimes(1);
  });

  it('agrupa eventos de pedido e itens sem duplicar a confirmação inicial', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.metrics).toHaveBeenCalledTimes(1);
    act(() => { for (let i = 0; i < 16; i++) { mocks.onChange?.(); mocks.onItemChange?.(); } });
    await waitFor(() => expect(mocks.metrics).toHaveBeenCalledTimes(2));
    act(() => { mocks.onStatus?.('CHANNEL_ERROR'); mocks.onStatus?.('SUBSCRIBED'); });
    await waitFor(() => expect(mocks.metrics).toHaveBeenCalledTimes(3));
  });

  it('não repete a carga ao alternar o foco com dados recentes', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => { focusManager.setFocused(false); focusManager.setFocused(true); });
    expect(mocks.metrics).toHaveBeenCalledTimes(1);
  });

  it('descarta respostas canceladas quando outra alteração ocorre durante uma consulta', async () => {
    let finishOld!: (value: DashboardMetrics) => void;
    mocks.metrics.mockResolvedValueOnce(snapshot(10))
      .mockImplementationOnce(() => new Promise((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(snapshot(30));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(result.current.metrics?.current.totalSales).toBe(10));
    act(() => mocks.onChange?.());
    await waitFor(() => expect(mocks.metrics).toHaveBeenCalledTimes(2));
    const oldSignal = mocks.metrics.mock.calls[1][1] as AbortSignal;
    act(() => mocks.onItemChange?.());
    await waitFor(() => expect(result.current.metrics?.current.totalSales).toBe(30));
    expect(oldSignal.aborted).toBe(true);
    await act(async () => finishOld(snapshot(20)));
    expect(result.current.metrics?.current.totalSales).toBe(30);
  });

  it('libera o failsafe e fecha a janela sem assinatura quando ela chega tarde', async () => {
    vi.useFakeTimers();
    const { wrapper } = setup();
    renderHook(() => useDashboardQueries(first), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(mocks.metrics).toHaveBeenCalledTimes(1);
    await act(async () => { mocks.onStatus?.('SUBSCRIBED'); await vi.advanceTimersByTimeAsync(150); });
    expect(mocks.metrics).toHaveBeenCalledTimes(2);
  });

  it('mostra erro sem recorrer ao download de pedidos e permite tentar novamente', async () => {
    mocks.metrics.mockRejectedValueOnce(new Error('consulta indisponível'));
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(result.current.ordersQueryError).toBe(true));
    expect(result.current.metrics).toBeUndefined();
    await act(async () => { await result.current.retryOrderQueries(); });
    await waitFor(() => expect(result.current.ordersQueryError).toBe(false));
    expect(result.current.metrics?.current.totalSales).toBe(10);
  });

  it.each(['identity', 'role'])('isola a cache por %s', async (scope) => {
    const { wrapper } = setup();
    const { result, rerender } = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(result.current.metrics?.current.totalSales).toBe(10));
    if (scope === 'identity') mocks.userId = 'user-b'; else mocks.role = 'manager';
    mocks.metrics.mockResolvedValue(snapshot(20));
    rerender();
    await waitFor(() => expect(mocks.channel).toHaveBeenCalledTimes(2));
    subscribe();
    await waitFor(() => expect(result.current.metrics?.current.totalSales).toBe(20));
  });

  it('revalida ao voltar à tela depois de encerrar a assinatura', async () => {
    const { wrapper } = setup();
    const initial = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(initial.result.current.loading).toBe(false));
    initial.unmount();
    mocks.metrics.mockResolvedValue(snapshot(20));
    const next = renderHook(() => useDashboardQueries(first), { wrapper });
    subscribe();
    await waitFor(() => expect(next.result.current.metrics?.current.totalSales).toBe(20));
    expect(mocks.metrics).toHaveBeenCalledTimes(2);
  });
});
