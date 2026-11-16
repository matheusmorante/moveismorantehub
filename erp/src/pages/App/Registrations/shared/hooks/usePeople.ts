import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPersons,
  fetchEmployeeDirectoryPage,
  moveToTrash,
  restorePerson,
  permanentDeletePerson,
  updatePerson,
  syncMissingEmployeesFromProfiles,
} from '@/pages/utils/personService';
import type { EmployeeDirectorySortBy, PersonMutationOptions } from '@/pages/utils/personService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { toast } from 'react-toastify';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { matchesSearchText } from '@/pages/utils/textUtils';

const EMPTY_PEOPLE: Awaited<ReturnType<typeof fetchPersons>> = [];
const EMPTY_PEOPLE_PAGE = { people: EMPTY_PEOPLE, totalItems: 0 };

export const usePeople = (collectionName: string, filters?: any) => {
  const queryClient = useQueryClient();
  const isEmployeeDirectory = collectionName === 'employees';
  const showTrash = Boolean(filters?.showTrash);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(15);
  const previousFilters = useRef(filters);
  const employeePage = isEmployeeDirectory && previousFilters.current !== filters
    ? 1
    : currentPage;
  const employeeSortBy: EmployeeDirectorySortBy =
    filters?.sortBy === 'createdAt' ? 'createdAt' : 'fullName';
  const employeeSortOrder = filters?.sortOrder === 'desc' ? 'desc' : 'asc';
  const employeeSyncStarted = useRef(false);
  const {
    mutate: syncEmployees,
    isPending: employeeSyncPending,
    isSuccess: employeesSynced,
    isError: employeeSyncFailed,
  } = useMutation({
    mutationFn: syncMissingEmployeesFromProfiles,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['people', 'employees', 'active'] }),
  });

  useEffect(() => {
    if (collectionName === 'employees' && !employeeSyncStarted.current) {
      employeeSyncStarted.current = true;
      syncEmployees();
    }
  }, [collectionName, syncEmployees]);

  const employeeQueryReady =
    collectionName !== 'employees' || employeesSynced || employeeSyncFailed;
  const queryOptions =
    collectionName === 'employees'
      ? { throwOnError: true as const, syncEmployeeProfiles: false }
      : { throwOnError: true as const };

  const { data: activePage = EMPTY_PEOPLE_PAGE, isLoading: loadingActive, error: activeError } = useQuery({
    queryKey: isEmployeeDirectory
      ? ['people', collectionName, 'active', employeePage, itemsPerPage, employeeSortBy, employeeSortOrder]
      : ['people', collectionName, 'active'],
    queryFn: async () => {
      if (isEmployeeDirectory) {
        return fetchEmployeeDirectoryPage({
          page: employeePage,
          pageSize: itemsPerPage,
          sortBy: employeeSortBy,
          sortOrder: employeeSortOrder,
        });
      }
      const rows = await fetchPersons(collectionName, false, queryOptions);
      return { people: rows, totalItems: rows.length };
    },
    enabled: employeeQueryReady,
    staleTime: 2 * 60 * 1000, // 2 minutos em cache fresco
    gcTime: 5 * 60 * 1000,
  });

  const { data: trashPage = EMPTY_PEOPLE_PAGE, isLoading: loadingTrash, error: trashError } = useQuery({
    queryKey: ['people', collectionName, 'trash'],
    queryFn: async () => {
      const rows = await fetchPersons(collectionName, true, queryOptions);
      return { people: rows, totalItems: rows.length };
    },
    enabled: showTrash, // Apenas busca lixeira quando a aba lixeira estiver aberta!
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  const setItemsPerPage = useCallback((pageSize: number) => {
    setItemsPerPageState(pageSize);
    setCurrentPage(1);
  }, []);

  const invalidatePeople = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['people', collectionName] });
  }, [queryClient, collectionName]);

  useEffect(() => {
    const handlePeopleUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        collectionName?: string;
        queryInvalidation?: string;
      }>).detail;
      if (detail?.collectionName && detail.collectionName !== collectionName) return;
      if (detail?.queryInvalidation) return;
      invalidatePeople();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('people_updated', handlePeopleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('people_updated', handlePeopleUpdate);
      }
    };
  }, [collectionName, invalidatePeople]);

  const runBulkMutation = useCallback(
    async (mutation: (id: string, options: PersonMutationOptions) => Promise<void>) => {
      const results = await Promise.allSettled(
        selectedPeople.map((id) => mutation(id, { deferQueryInvalidation: true }))
      );
      invalidatePeople();
      const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );
      if (failure) throw failure.reason;
    },
    [selectedPeople, invalidatePeople]
  );

  useEffect(() => {
    previousFilters.current = filters;
    setCurrentPage(1);
    setSelectedPeople([]);
  }, [filters]);

  const filteredPeople = useMemo(() => {
    const showTrash = filters?.showTrash || false;

    // Use the appropriate list from DB — already filtered server-side
    const sourceList = showTrash ? trashPage.people : activePage.people;

    // The employee directory has already applied these filters, de-duplication
    // and ordering on the server before paging. Re-applying them here would
    // make the page incomplete and the total count incorrect.
    if (isEmployeeDirectory && !showTrash) return sourceList;

    return sourceList
      .filter((person) => {
        if (collectionName === 'employees') {
          const userRoles = getProfileRoles(person);
          if (userRoles.length === 0) return false;
        }

        if (!filters) return true;

        const normalize = (str: string) =>
          str
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        const searchTerm = normalize(filters.search || '');
        const searchMatch =
          !filters.search ||
          matchesSearchText(person.fullName, searchTerm) ||
          matchesSearchText(person.email, searchTerm) ||
          person.cpfCnpj?.includes(filters.search);

        const activeMatch =
          filters.activeOnly === undefined || person.active === filters.activeOnly;

        return searchMatch && activeMatch;
      })
      .sort((a, b) => {
        let comparison = 0;
        const sortBy = filters?.sortBy || 'fullName';

        if (sortBy === 'fullName') {
          comparison = (a.fullName || '').localeCompare(b.fullName || '');
        } else if (sortBy === 'createdAt') {
          comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
        }

        const sortOrder = filters?.sortOrder || 'asc';
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [activePage.people, trashPage.people, filters, collectionName, isEmployeeDirectory]);

  const totalItems = isEmployeeDirectory && !showTrash
    ? activePage.totalItems
    : filteredPeople.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  useEffect(() => {
    if (loadingActive) return;
    setCurrentPage((page) => {
      const lastValidPage = Math.max(1, totalPages);
      return Math.min(page, lastValidPage);
    });
  }, [totalPages, loadingActive]);

  const paginatedPeople = useMemo(() => {
    if (isEmployeeDirectory && !showTrash) return filteredPeople;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPeople.slice(start, start + itemsPerPage);
  }, [filteredPeople, currentPage, itemsPerPage, isEmployeeDirectory, showTrash]);

  const loading =
    (showTrash ? loadingTrash : loadingActive) ||
    (collectionName === 'employees' && employeeSyncPending);

  const handleDelete = async (id: string) => {
    await moveToTrash(collectionName, id);
    toast.info('Movido para a lixeira.');
  };

  const handleRestore = async (id: string) => {
    await restorePerson(collectionName, id);
    toast.success('Restaurado com sucesso!');
  };

  const handlePermanentDelete = async (id: string) => {
    if (collectionName === 'suppliers') {
      try {
        await permanentDeletePerson(collectionName, id);
        toast.success('Fornecedor excluído permanentemente.');
      } catch {
        toast.error('Não foi possível excluir o fornecedor. Atualize a lista e confira os vínculos.');
      }
      return;
    }

    if (await requestConfirmation({
      title: 'Excluir pessoa permanentemente?',
      message: 'Certeza que deseja excluir DEFINITIVAMENTE?',
      confirmLabel: 'Excluir permanentemente',
      type: 'danger',
    })) {
      await permanentDeletePerson(collectionName, id);
      toast.success('Excluído permanentemente.');
    }
  };

  const handleBulkTrash = async () => {
    if (selectedPeople.length === 0) return;
    try {
      await runBulkMutation((id, options) => moveToTrash(collectionName, id, options));
      toast.info(`${selectedPeople.length} item(ns) movido(s) para a lixeira.`);
      setSelectedPeople([]);
    } catch {
      toast.error('Erro ao mover alguns itens para a lixeira.');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedPeople.length === 0) return;
    try {
      await runBulkMutation((id, options) => restorePerson(collectionName, id, options));
      toast.success(`${selectedPeople.length} item(ns) restaurado(s) com sucesso!`);
      setSelectedPeople([]);
    } catch {
      toast.error('Erro ao restaurar alguns itens.');
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedPeople.length === 0) return;
    if (await requestConfirmation({
      title: 'Excluir pessoas permanentemente?',
      message: `Excluir DEFINITIVAMENTE ${selectedPeople.length} item(ns)?`,
      confirmLabel: 'Excluir permanentemente',
      type: 'danger',
    })) {
      try {
        await runBulkMutation((id, options) =>
          permanentDeletePerson(collectionName, id, options)
        );
        toast.success(`${selectedPeople.length} item(ns) excluído(s) permanentemente.`);
        setSelectedPeople([]);
      } catch {
        toast.error('Erro ao excluir alguns itens.');
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const allIdsOnPage = paginatedPeople.map((p) => p.id!).filter(Boolean);
    const allSelected =
      allIdsOnPage.length > 0 && allIdsOnPage.every((id) => selectedPeople.includes(id));

    if (allSelected) {
      setSelectedPeople((prev) => prev.filter((id) => !allIdsOnPage.includes(id)));
    } else {
      const newSelections = allIdsOnPage.filter((id) => !selectedPeople.includes(id));
      setSelectedPeople((prev) => [...prev, ...newSelections]);
    }
  };

  const clearSelection = () => setSelectedPeople([]);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updatePerson(collectionName, id, { active: !currentStatus });
      toast.success(`${!currentStatus ? 'Ativado' : 'Desativado'} com sucesso!`);
    } catch {
      toast.error('Erro ao alterar status.');
    }
  };

  const refresh = () => {
    invalidatePeople();
  };

  return {
    people: paginatedPeople,
    totalItems,
    currentPage: employeePage,
    itemsPerPage,
    totalPages,
    setCurrentPage,
    setItemsPerPage,
    loading,
    error: showTrash ? trashError : activeError,
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    selectedPeople,
    toggleSelection,
    selectAll,
    clearSelection,
    handleBulkTrash,
    handleBulkRestore,
    handleBulkPermanentDelete,
    toggleActive,
    refresh,
  };
};
