import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchPersons,
  moveToTrash,
  restorePerson,
  permanentDeletePerson,
  updatePerson,
  syncMissingEmployeesFromProfiles,
} from '@/pages/utils/personService';
import type { PersonMutationOptions } from '@/pages/utils/personService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { toast } from 'react-toastify';

const EMPTY_PEOPLE: Awaited<ReturnType<typeof fetchPersons>> = [];

export const usePeople = (collectionName: string, filters?: any) => {
  const queryClient = useQueryClient();
  const showTrash = Boolean(filters?.showTrash);
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

  const { data: people = EMPTY_PEOPLE, isLoading: loadingActive, error: activeError } = useQuery({
    queryKey: ['people', collectionName, 'active'],
    queryFn: () => fetchPersons(collectionName, false, queryOptions),
    enabled: employeeQueryReady,
    staleTime: 2 * 60 * 1000, // 2 minutos em cache fresco
    gcTime: 5 * 60 * 1000,
  });

  const { data: trashedPeople = EMPTY_PEOPLE, isLoading: loadingTrash, error: trashError } = useQuery({
    queryKey: ['people', collectionName, 'trash'],
    queryFn: () => fetchPersons(collectionName, true, queryOptions),
    enabled: showTrash, // Apenas busca lixeira quando a aba lixeira estiver aberta!
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPageState] = useState(15);
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
    setCurrentPage(1);
    setSelectedPeople([]);
  }, [filters]);

  const filteredPeople = useMemo(() => {
    const showTrash = filters?.showTrash || false;

    // Use the appropriate list from DB — already filtered server-side
    const sourceList = showTrash ? trashedPeople : people;

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
          normalize(person.fullName || '').includes(searchTerm) ||
          normalize(person.email || '').includes(searchTerm) ||
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
  }, [people, trashedPeople, filters, collectionName]);

  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const totalItems = filteredPeople.length;

  useEffect(() => {
    setCurrentPage((page) => {
      const lastValidPage = Math.max(1, totalPages);
      return Math.min(page, lastValidPage);
    });
  }, [totalPages]);

  const paginatedPeople = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPeople.slice(start, start + itemsPerPage);
  }, [filteredPeople, currentPage, itemsPerPage]);

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
    if (window.confirm('Certeza que deseja excluir DEFINITIVAMENTE?')) {
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
    if (window.confirm(`Excluir DEFINITIVAMENTE ${selectedPeople.length} item(ns)?`)) {
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
    currentPage,
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
