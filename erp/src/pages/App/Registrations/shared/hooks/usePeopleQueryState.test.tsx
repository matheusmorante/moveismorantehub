// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchPersons: vi.fn(), updatePerson: vi.fn() }));

vi.mock('@/pages/utils/personService', () => ({
  fetchPersons: mocks.fetchPersons,
  moveToTrash: vi.fn(),
  restorePerson: vi.fn(),
  permanentDeletePerson: vi.fn(),
  updatePerson: mocks.updatePerson,
}));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => ['seller'] }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { usePeople } from './usePeople';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('usePeople query state', () => {
  const createQueryWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { queryClient, wrapper };
  };

  it('loads the trash list only when requested and keeps it scoped to the collection', async () => {
    mocks.fetchPersons.mockImplementation(async (collectionName: string, showTrash: boolean) => [
      { id: `${collectionName}-${showTrash ? 'trash' : 'active'}`, fullName: 'Registro' },
    ]);
    const { wrapper } = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ collectionName, showTrash }: { collectionName: string; showTrash: boolean }) =>
        usePeople(collectionName, useMemo(() => ({ showTrash }), [showTrash])),
      { initialProps: { collectionName: 'customers', showTrash: false }, wrapper }
    );

    await waitFor(() => expect(result.current.people[0]?.id).toBe('customers-active'));
    expect(mocks.fetchPersons).toHaveBeenCalledWith('customers', false, { throwOnError: true });
    expect(mocks.fetchPersons).not.toHaveBeenCalledWith('customers', true, expect.anything());

    rerender({ collectionName: 'customers', showTrash: true });
    await waitFor(() => expect(result.current.people[0]?.id).toBe('customers-trash'));
    expect(mocks.fetchPersons).toHaveBeenCalledWith('customers', true, { throwOnError: true });

    rerender({ collectionName: 'suppliers', showTrash: false });
    await waitFor(() => expect(result.current.people[0]?.id).toBe('suppliers-active'));
    expect(mocks.fetchPersons).toHaveBeenCalledWith('suppliers', false, { throwOnError: true });
  });

  it('invalidates only the selected collection after a successful update', async () => {
    mocks.fetchPersons.mockResolvedValue([{ id: 'customer-1', fullName: 'Cliente', active: true }]);
    mocks.updatePerson.mockResolvedValue(undefined);
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePeople('customers'), { wrapper });

    await waitFor(() => expect(result.current.people).toHaveLength(1));
    await act(async () => {
      await result.current.toggleActive('customer-1', true);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['people', 'customers'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['people', 'suppliers'] });
  });

  it('keeps the empty result stable when the people query fails', async () => {
    mocks.fetchPersons.mockRejectedValueOnce(new Error('falha ao carregar pessoas'));
    const { result } = renderHook(() => usePeople('customers'), { wrapper: createQueryWrapper().wrapper });
    const initialEmptyList = result.current.people;

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.people).toBe(initialEmptyList);
    expect(mocks.fetchPersons).toHaveBeenCalledTimes(1);
  });

  it('recovers the people list when refresh retries a failed query', async () => {
    mocks.fetchPersons
      .mockRejectedValueOnce(new Error('falha temporária'))
      .mockResolvedValueOnce([{ id: 'recovered-person', fullName: 'Registro' }]);
    const { result } = renderHook(() => usePeople('customers'), {
      wrapper: createQueryWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.error).toBeTruthy());
    act(() => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.people[0]?.id).toBe('recovered-person'));
    expect(result.current.error).toBeNull();
  });
});
