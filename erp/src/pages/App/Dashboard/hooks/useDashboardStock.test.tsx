// @vitest-environment happy-dom
import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tableResults: {} as Record<string, { data: unknown[] | null; error: unknown | null }>,
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  subscriptionStatus: undefined as ((status: string) => void) | undefined,
  fromCalls: [] as string[],
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'operator-1' }, profile: { id: 'operator-1', role: 'administrator' } }),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: { from: mocks.from, channel: mocks.channel, removeChannel: mocks.removeChannel },
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
  mocks.tableResults = {
    products: { data: [], error: null },
    inventory_moves: { data: [], error: null },
  };
  mocks.fromCalls = [];
  mocks.subscriptionStatus = undefined;
  mocks.from.mockReset().mockImplementation((table: string) => {
    mocks.fromCalls.push(table);
    const query: Record<string, any> = {};
    for (const method of ['select', 'is', 'eq', 'or', 'order', 'range', 'in', 'limit']) {
      query[method] = () => query;
    }
    query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(mocks.tableResults[table] ?? { data: [], error: null }).then(resolve, reject);
    return query;
  });
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
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('consulta de estoque do Dashboard', () => {
  it('propaga falhas da leitura para o estado de erro', async () => {
    mocks.tableResults.products = { data: null, error: new Error('leitura indisponível') };
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
  });

  it('reconsulta os indicadores quando a assinatura Realtime fica ativa', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDashboardStock(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocks.fromCalls.filter((table) => table === 'products')).toHaveLength(1);

    act(() => mocks.subscriptionStatus?.('SUBSCRIBED'));
    await waitFor(() => expect(mocks.fromCalls.filter((table) => table === 'products')).toHaveLength(2), { timeout: 1000 });
  });
});
