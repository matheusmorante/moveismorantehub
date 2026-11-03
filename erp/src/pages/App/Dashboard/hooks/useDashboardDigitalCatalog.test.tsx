// @vitest-environment happy-dom
import React from 'react';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-a' }, profile: { id: 'user-a', role: 'administrator', roles: [] } }),
}));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { rpc: mocks.rpc } }));

import { useDashboardDigitalCatalog } from './useDashboardDigitalCatalog';

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  mocks.rpc.mockReset().mockResolvedValue({
    data: { products: 1, published: 1, draft: 0, categories: 2, views: 2560, uniqueVisitors: 10 },
    error: null,
  });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('métricas agregadas do catálogo no Dashboard', () => {
  it('reutiliza a RPC agregada ao desmontar e remontar com a troca de período', async () => {
    const { wrapper } = setup();
    const firstMount = renderHook(() => useDashboardDigitalCatalog(), { wrapper });
    await waitFor(() => expect(firstMount.result.current.data?.views).toBe(2560));
    expect(firstMount.result.current.data).toMatchObject({ products: 1, categories: 2, uniqueVisitors: 10 });
    firstMount.unmount();

    const nextPeriodMount = renderHook(() => useDashboardDigitalCatalog(), { wrapper });
    await waitFor(() => expect(nextPeriodMount.result.current.data?.views).toBe(2560));

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith('get_dashboard_digital_catalog_metrics');
    expect(nextPeriodMount.result.current.data?.conversionRate).toBe(3.5);
  });

  it('não interpreta erro da agregação como catálogo vazio', async () => {
    const { wrapper } = setup();
    const error = new Error('falha de leitura');
    mocks.rpc.mockResolvedValue({ data: null, error });
    const query = renderHook(() => useDashboardDigitalCatalog(), { wrapper });
    await waitFor(() => expect(query.result.current.isError).toBe(true));
    expect(query.result.current.data).toBeUndefined();
  });
});
