// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchVariations: vi.fn() }));

vi.mock('../../utils/variationService', () => ({
  fetchVariations: mocks.fetchVariations,
  moveToTrash: vi.fn(),
  getVariationErrorMessage: (_error: unknown, fallback: string) => fallback,
}));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { useVariations } from './useVariations';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useVariations query state', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  it('preserves the cached list and exposes the refetch failure', async () => {
    const cachedVariation = { id: 'variation-1', name: 'Cor', values: [], deleted: false };
    mocks.fetchVariations
      .mockResolvedValueOnce([cachedVariation])
      .mockRejectedValueOnce(new Error('falha ao atualizar características'));
    const { result } = renderHook(() => useVariations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.variations).toEqual([cachedVariation]));
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(mocks.fetchVariations).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.variations).toEqual([cachedVariation]);
    expect(mocks.fetchVariations).toHaveBeenCalledTimes(2);
  });

  it('surfaces an initial query failure instead of treating it as an empty list', async () => {
    mocks.fetchVariations.mockRejectedValueOnce(new Error('falha ao carregar características'));
    const { result } = renderHook(() => useVariations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.variations).toEqual([]);
  });

  it('recovers characteristics when refresh retries a failed query', async () => {
    const recoveredVariation = { id: 'variation-recovered', name: 'Acabamento', values: [], deleted: false };
    mocks.fetchVariations
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce([recoveredVariation]);
    const { result } = renderHook(() => useVariations(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.variations).toEqual([recoveredVariation]));
    expect(result.current.error).toBeNull();
  });
});
