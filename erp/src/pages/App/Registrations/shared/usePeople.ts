import { useState, useEffect, useMemo } from "react";
import Person from "../../../types/person.type";
import { subscribeToPeople, moveToTrash, restorePerson, permanentDeletePerson, updatePerson } from '@/pages/utils/personService';
import { toast } from "react-toastify";

export const usePeople = (collectionName: string, filters?: any) => {
    const [people, setPeople] = useState<Person[]>([]);
    const [trashedPeople, setTrashedPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedPeople, setSelectedPeople] = useState<string[]>([]);

    // Subscription for active records
    useEffect(() => {
        const unsubscribe = subscribeToPeople(collectionName, (data: Person[]) => {
            setPeople(data);
            setLoading(false);
        }, false);
        return () => unsubscribe();
    }, [collectionName]);

    // Subscription for deleted records (trash)
    useEffect(() => {
        const unsubscribe = subscribeToPeople(collectionName, (data: Person[]) => {
            setTrashedPeople(data);
        }, true);
        return () => unsubscribe();
    }, [collectionName]);

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
            .filter(person => {
                // Draft logic: if we are viewing trash, we don't care about draft status (or we might, but usually trash is trash)
                // If we are NOT in trash, we show everything (including drafts)
                if (showTrash) {
                    // usually deleted items are not considered "drafts" in the main list sense
                } else {
                    // Show everything: active, inactive, drafts
                }

                if (!filters) return true;

                const searchMatch = !filters.search ||
                    person.fullName?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    person.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
                    person.cpfCnpj?.includes(filters.search);

                const activeMatch = filters.activeOnly === undefined || person.active === filters.activeOnly;

                return searchMatch && activeMatch;
            })
            .sort((a, b) => {
                let comparison = 0;
                const sortBy = filters?.sortBy || 'fullName';

                if (sortBy === "fullName") {
                    comparison = (a.fullName || "").localeCompare(b.fullName || "");
                } else if (sortBy === "createdAt") {
                    comparison = (a.createdAt || "").localeCompare(b.createdAt || "");
                }

                const sortOrder = filters?.sortOrder || 'asc';
                return sortOrder === "asc" ? comparison : -comparison;
            });
    }, [people, trashedPeople, filters]);

    const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);
    const totalItems = filteredPeople.length;

    const paginatedPeople = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredPeople.slice(start, start + itemsPerPage);
    }, [filteredPeople, currentPage, itemsPerPage]);

    const handleDelete = async (id: string) => {
        await moveToTrash(collectionName, id);
        toast.info("Movido para a lixeira.");
    };

    const handleRestore = async (id: string) => {
        await restorePerson(collectionName, id);
        toast.success("Restaurado com sucesso!");
    };

    const handlePermanentDelete = async (id: string) => {
        if (window.confirm("Certeza que deseja excluir DEFINITIVAMENTE?")) {
            await permanentDeletePerson(collectionName, id);
            toast.success("Excluído permanentemente.");
        }
    };

    const handleBulkTrash = async () => {
        if (selectedPeople.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(selectedPeople.map(id => moveToTrash(collectionName, id)));
            toast.info(`${selectedPeople.length} item(ns) movido(s) para a lixeira.`);
            setSelectedPeople([]);
        } catch (error) {
            toast.error("Erro ao mover alguns itens para a lixeira.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRestore = async () => {
        if (selectedPeople.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(selectedPeople.map(id => restorePerson(collectionName, id)));
            toast.success(`${selectedPeople.length} item(ns) restaurado(s) com sucesso!`);
            setSelectedPeople([]);
        } catch (error) {
            toast.error("Erro ao restaurar alguns itens.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPermanentDelete = async () => {
        if (selectedPeople.length === 0) return;
        if (window.confirm(`Excluir DEFINITIVAMENTE ${selectedPeople.length} item(ns)?`)) {
            setLoading(true);
            try {
                await Promise.all(selectedPeople.map(id => permanentDeletePerson(collectionName, id)));
                toast.success(`${selectedPeople.length} item(ns) excluído(s) permanentemente.`);
                setSelectedPeople([]);
            } catch (error) {
                toast.error("Erro ao excluir alguns itens.");
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedPeople(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const allIdsOnPage = paginatedPeople.map(p => p.id!).filter(Boolean);
        const allSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedPeople.includes(id));

        if (allSelected) {
            setSelectedPeople(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            const newSelections = allIdsOnPage.filter(id => !selectedPeople.includes(id));
            setSelectedPeople(prev => [...prev, ...newSelections]);
        }
    };

    const clearSelection = () => setSelectedPeople([]);

    const toggleActive = async (id: string, currentStatus: boolean) => {
        try {
            await updatePerson(collectionName, id, { active: !currentStatus });
            toast.success(`${!currentStatus ? 'Ativado' : 'Desativado'} com sucesso!`);
        } catch (error) {
            toast.error("Erro ao alterar status.");
        }
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
        toggleActive
    };
};
