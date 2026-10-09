import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Person from '../../../../types/person.type';
import {
  fetchPersons,
  moveToTrash,
  restorePerson,
  permanentDeletePerson,
  updatePerson,
} from '@/pages/utils/personService';
import { getProfileRoles } from '@/pages/utils/accessRoles';
import { toast } from 'react-toastify';

export const usePeople = (collectionName: string, filters?: any) => {
  const queryClient = useQueryClient();
  const showTrash = Boolean(filters?.showTrash);

  const { data: people = [], isLoading: loadingActive } = useQuery({
    queryKey: ['people', collectionName, 'active'],
    queryFn: () => fetchPersons(collectionName, false),
    staleTime: 2 * 60 * 1000, // 2 minutos em cache fresco
    gcTime: 5 * 60 * 1000,
  });

  const { data: trashedPeople = [], isLoading: loadingTrash } = useQuery({
    queryKey: ['people', collectionName, 'trash'],
    queryFn: () => fetchPersons(collectionName, true),
    enabled: showTrash, // Apenas busca lixeira quando a aba lixeira estiver aberta!
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

  const invalidatePeople = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['people', collectionName] });
  }, [queryClient, collectionName]);

  useEffect(() => {
    const handlePeopleUpdate = () => invalidatePeople();
    if (typeof window !== 'undefined') {
      window.addEventListener('people_updated', handlePeopleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('people_updated', handlePeopleUpdate);
      }
    };
  }, [invalidatePeople]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPeople([]);
  }, [filters]);

  const filteredPeople = useMemo(() => {
    const showTrash = filters?.showTrash || false;
    const isDraft = filters?.isDraft || false;

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
  }, [people, trashedPeople, filters]);

  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
  const totalItems = filteredPeople.length;

  const paginatedPeople = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPeople.slice(start, start + itemsPerPage);
  }, [filteredPeople, currentPage, itemsPerPage]);

  const loading = showTrash ? loadingTrash : loadingActive;

  const handleDelete = async (id: string) => {
    await moveToTrash(collectionName, id);
    toast.info('Movido para a lixeira.');
    invalidatePeople();
  };

  const handleRestore = async (id: string) => {
    await restorePerson(collectionName, id);
    toast.success('Restaurado com sucesso!');
    invalidatePeople();
  };

  const handlePermanentDelete = async (id: string) => {
    if (window.confirm('Certeza que deseja excluir DEFINITIVAMENTE?')) {
      await permanentDeletePerson(collectionName, id);
      toast.success('Excluído permanentemente.');
      invalidatePeople();
    }
  };

  const handleBulkTrash = async () => {
    if (selectedPeople.length === 0) return;
    try {
      await Promise.all(selectedPeople.map((id) => moveToTrash(collectionName, id)));
      toast.info(`${selectedPeople.length} item(ns) movido(s) para a lixeira.`);
      setSelectedPeople([]);
      invalidatePeople();
    } catch (error) {
      toast.error('Erro ao mover alguns itens para a lixeira.');
    }
  };

  const handleBulkRestore = async () => {
    if (selectedPeople.length === 0) return;
    try {
      await Promise.all(selectedPeople.map((id) => restorePerson(collectionName, id)));
      toast.success(`${selectedPeople.length} item(ns) restaurado(s) com sucesso!`);
      setSelectedPeople([]);
      invalidatePeople();
    } catch (error) {
      toast.error('Erro ao restaurar alguns itens.');
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedPeople.length === 0) return;
    if (window.confirm(`Excluir DEFINITIVAMENTE ${selectedPeople.length} item(ns)?`)) {
      try {
        await Promise.all(selectedPeople.map((id) => permanentDeletePerson(collectionName, id)));
        toast.success(`${selectedPeople.length} item(ns) excluído(s) permanentemente.`);
        setSelectedPeople([]);
        invalidatePeople();
      } catch (error) {
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
      invalidatePeople();
    } catch (error) {
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
