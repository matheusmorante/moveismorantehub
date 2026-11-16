// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionStatus: undefined as ((status: string) => void) | undefined,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'operator-1' }, profile: { id: 'operator-1', role: 'administrator' } }),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { rpc: mocks.rpc, from: mocks.from, channel: mocks.channel, removeChannel: mocks.removeChannel },
}));

import { useDashboardStock } from './useDashboardStock';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({ data: {
    zeroStockCount: 37, lowStockCount: 13,
    lowStockItems: [
      { productId: 'product-1', variationId: 'variation-1', name: 'Mesa — Branca', stock: 0, minStock: 2, isZero: true },
      { productId: 'product-2', name: 'Cadeira', stock: 1, minStock: 3, isZero: false },
    ],
    pendingInventory: { code: 'INV-1', date: '2026-11-04T10:00:00+00:00', responsibleName: 'Operador' },
  }, error: null });
  mocks.subscriptionStatus = undefined;
  mocks.from.mockReset().mockImplementation(() => { throw new Error('O painel não deve baixar tabelas de produtos.'); });
  mocks.channel.mockReset().mockImplementation(() => {
    const channel: any = {
      on: vi.fn(() => channel),
      subscribe: vi.fn((status: (value: string) => void) => {
        mocks.subscriptionStatus = status;
        return channel;
      }),
    };
    return channel;
  });
  mocks.removeChannel.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('consulta de estoque do Dashboard', () => {
  it('propaga falhas da leitura para o estado de erro', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('leitura indisponível') });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });

    expect(mocks.rpc).not.toHaveBeenCalled();
    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  it('faz uma leitura inicial ao assinar e revalida em uma nova assinatura', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);

    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2), { timeout: 1000 });
  });

  it('usa totais globais do servidor, preservando variações e inventário sem baixar candidatos', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });
    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.rpc).toHaveBeenCalledWith('get_dashboard_stock_summary');
    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ zeroStockCount: 37, lowStockCount: 13, error: false,
      lowStockItems: [expect.objectContaining({ variationId: 'variation-1', name: 'Mesa — Branca' }), expect.objectContaining({ stock: 1 })],
      pendingInventory: { code: 'INV-1', responsibleName: 'Operador' },
    });
  });

  it('mantém a resposta em cache visível enquanto aguarda a assinatura e a confere ao conectar', async () => {
    const { client, wrapper } = setup();
    client.setQueryData(['dashboard-stock', 'operator-1', 'administrator'], {
      zeroStockCount: 5,
      lowStockCount: 2,
      lowStockItems: [],
      pendingInventory: null,
    });
    const { result } = renderHook(() => useDashboardStock(), { wrapper });

    expect(result.current.zeroStockCount).toBe(5);
    expect(result.current.loading).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();

    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
  });

  it('libera a primeira leitura após um segundo e confirma se a assinatura chegar depois', async () => {
    vi.useFakeTimers();
    const { wrapper } = setup();
    renderHook(() => useDashboardStock(), { wrapper });
    expect(mocks.rpc).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1_000); });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);

    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await act(async () => { await vi.advanceTimersByTimeAsync(200); });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it('não transforma uma resposta incompleta em estoque sem pendências', async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });
    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('recusa uma resposta fora do limite de oito itens, mantendo erro visível', async () => {
    const data = (await mocks.rpc()).data;
    mocks.rpc.mockResolvedValue({ data: { ...data, lowStockItems: Array.from({ length: 9 }, () => data.lowStockItems[0]) }, error: null });
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });
    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });
});
