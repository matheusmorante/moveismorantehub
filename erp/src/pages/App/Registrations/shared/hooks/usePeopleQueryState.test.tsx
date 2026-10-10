// @vitest-environment happy-dom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchPersons: vi.fn(),
  updatePerson: vi.fn(),
  moveToTrash: vi.fn(),
  restorePerson: vi.fn(),
  permanentDeletePerson: vi.fn(),
  syncMissingEmployeesFromProfiles: vi.fn(),
}));

vi.mock('@/pages/utils/personService', () => ({
  fetchPersons: mocks.fetchPersons,
  moveToTrash: mocks.moveToTrash,
  restorePerson: mocks.restorePerson,
  permanentDeletePerson: mocks.permanentDeletePerson,
  updatePerson: mocks.updatePerson,
  syncMissingEmployeesFromProfiles: mocks.syncMissingEmployeesFromProfiles,
}));
vi.mock('@/pages/utils/accessRoles', () => ({ getProfileRoles: () => ['seller'] }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import { usePeople } from './usePeople';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.syncMissingEmployeesFromProfiles.mockReset();
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

  it('runs employee profile synchronization as a mutation before the read query', async () => {
    let finishSync!: () => void;
    mocks.syncMissingEmployeesFromProfiles.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSync = resolve;
      })
    );
    mocks.fetchPersons.mockResolvedValue([{ id: 'employee-1', fullName: 'Pessoa' }]);
    const { result } = renderHook(() => usePeople('employees'), {
      wrapper: createQueryWrapper().wrapper,
    });

    await waitFor(() => expect(mocks.syncMissingEmployeesFromProfiles).toHaveBeenCalledTimes(1));
    expect(mocks.fetchPersons).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);

    act(() => finishSync());

    await waitFor(() => expect(result.current.people[0]?.id).toBe('employee-1'));
    expect(result.current.loading).toBe(false);
    expect(mocks.fetchPersons).toHaveBeenCalledWith('employees', false, {
      throwOnError: true,
      syncEmployeeProfiles: false,
    });
  });

  it('invalidates only the selected collection after a successful update', async () => {
    mocks.fetchPersons.mockResolvedValue([{ id: 'customer-1', fullName: 'Cliente', active: true }]);
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mocks.updatePerson.mockImplementation(async (collectionName: string) => {
      window.dispatchEvent(
        new CustomEvent('people_updated', {
          detail: { collectionName, queryInvalidation: 'service' },
        })
      );
      await queryClient.invalidateQueries({ queryKey: ['people', collectionName] });
    });
    const { result } = renderHook(() => usePeople('customers'), { wrapper });

    await waitFor(() => expect(result.current.people).toHaveLength(1));
    await act(async () => {
      await result.current.toggleActive('customer-1', true);
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['people', 'customers'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['people', 'suppliers'] });
  });

  it('ignores people update events emitted for another collection', async () => {
    mocks.fetchPersons.mockResolvedValue([{ id: 'customer-1', fullName: 'Cliente' }]);
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => usePeople('customers'), { wrapper });
    await waitFor(() => expect(mocks.fetchPersons).toHaveBeenCalledTimes(1));

    window.dispatchEvent(
      new CustomEvent('people_updated', { detail: { collectionName: 'suppliers' } })
    );

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('keeps the empty result stable when the people query fails', async () => {
    mocks.fetchPersons.mockRejectedValueOnce(new Error('falha ao carregar pessoas'));
    const { result } = renderHook(() => usePeople('customers'), { wrapper: createQueryWrapper().wrapper });
    const initialEmptyList = result.current.people;

    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.people).toBe(initialEmptyList);
    expect(mocks.fetchPersons).toHaveBeenCalledTimes(1);
  });

  it('volta à primeira página quando o tamanho da página muda', async () => {
    mocks.fetchPersons.mockResolvedValue(
      Array.from({ length: 40 }, (_, index) => ({
        id: `customer-${index + 1}`,
        fullName: `Cliente ${index + 1}`,
        active: true,
      }))
    );
    const { result } = renderHook(() => usePeople('customers'), {
      wrapper: createQueryWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.totalItems).toBe(40));
    act(() => {
      result.current.setItemsPerPage(10);
    });
    const firstPersonOnFirstPage = result.current.people[0]?.id;
    act(() => {
      result.current.setCurrentPage(3);
    });
    expect(result.current.currentPage).toBe(3);
    expect(result.current.people[0]?.id).not.toBe(firstPersonOnFirstPage);

    act(() => result.current.setItemsPerPage(25));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.people).toHaveLength(25);
    expect(result.current.people[0]?.id).toBe(firstPersonOnFirstPage);
  });

  it('mantém a página atual válida quando a lista diminui após atualização', async () => {
    const createPeople = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: `customer-${index + 1}`,
        fullName: `Cliente ${String(index + 1).padStart(2, '0')}`,
      }));
    mocks.fetchPersons.mockResolvedValueOnce(createPeople(20)).mockResolvedValueOnce(createPeople(5));
    const { result } = renderHook(() => usePeople('customers'), {
      wrapper: createQueryWrapper().wrapper,
    });

    await waitFor(() => expect(result.current.totalItems).toBe(20));
    act(() => {
      result.current.setItemsPerPage(10);
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.people[0]?.id).toBe('customer-11');

    act(() => result.current.refresh());

    await waitFor(() => {
      expect(result.current.totalItems).toBe(5);
      expect(result.current.currentPage).toBe(1);
    });
    expect(result.current.people.map((person) => person.id)).toEqual([
      'customer-1',
      'customer-2',
      'customer-3',
      'customer-4',
      'customer-5',
    ]);
  });

  it('invalida uma vez após mutações em lote mesmo quando há falha parcial', async () => {
    mocks.fetchPersons.mockResolvedValue([
      { id: 'customer-1', fullName: 'Cliente 1' },
      { id: 'customer-2', fullName: 'Cliente 2' },
    ]);
    const { queryClient, wrapper } = createQueryWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mocks.moveToTrash.mockImplementation(
      async (collectionName: string, id: string, options: { deferQueryInvalidation: boolean }) => {
        expect(options).toEqual({ deferQueryInvalidation: true });
        if (id === 'customer-2') throw new Error('falha ao mover');
        window.dispatchEvent(
          new CustomEvent('people_updated', {
            detail: { collectionName, queryInvalidation: 'deferred' },
          })
        );
      }
    );
    const { result } = renderHook(() => usePeople('customers'), { wrapper });
    await waitFor(() => expect(result.current.people).toHaveLength(2));
    act(() => {
      result.current.toggleSelection('customer-1');
      result.current.toggleSelection('customer-2');
    });

    await act(async () => result.current.handleBulkTrash());

    expect(mocks.moveToTrash).toHaveBeenCalledTimes(2);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['people', 'customers'] });
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
