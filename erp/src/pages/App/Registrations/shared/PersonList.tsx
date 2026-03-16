import React, { forwardRef, useImperativeHandle, useEffect } from "react";
import PersonTable from "./PersonTable";
import { usePeople } from "./usePeople";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";

interface PersonListProps {
    onEdit: (person: Person) => void;
    filters?: any;
    visibilitySettings: PersonVisibilitySettings;
    onToggleColumn: (column: keyof PersonVisibilitySettings) => void;
    onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    collectionName: string;
    storageKey: string;
    onViewPurchaseHistory?: (person: Person) => void;
};

export interface PersonListRef {
    refresh: () => void;
}

const PersonList = forwardRef<PersonListRef, PersonListProps>(({
    onEdit,
    filters,
    visibilitySettings,
    onToggleColumn,
    onSort,
    collectionName,
    storageKey,
    onViewPurchaseHistory
}, ref) => {
    const {
        people,
        loading,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
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
        refresh
    } = usePeople(collectionName, filters);

    useImperativeHandle(ref, () => ({
        refresh
    }));

    const getPageButtons = () => {
        const buttons: number[] = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            buttons.push(i);
        }
        return buttons;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Carregando...</p>
            </div>
        );
    }

    if (people.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center">
                    <i className="bi bi-person-lines-fill text-4xl text-slate-200 dark:text-slate-800"></i>
                </div>
                <div className="text-center">
                    <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhum registro encontrado</p>
                    <p className="text-slate-400 dark:text-slate-600 text-xs">Tente ajustar seus filtros ou adicione um novo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="p-4 md:p-8">
                <PersonTable
                    people={people}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    onPermanentDelete={handlePermanentDelete}
                    onToggleActive={toggleActive}
                    visibilitySettings={visibilitySettings}
                    onToggleColumn={onToggleColumn}
                    showTrash={filters?.showTrash}
                    filters={filters}
                    onSort={onSort}
                    selectedPeople={selectedPeople}
                    onToggleSelection={toggleSelection}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                    onBulkTrash={handleBulkTrash}
                    onBulkRestore={handleBulkRestore}
                    onBulkPermanentDelete={handleBulkPermanentDelete}
                    storageKey={storageKey}
                    onViewPurchaseHistory={onViewPurchaseHistory}
                />

                {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-between flex-wrap gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                                Mostrando {people.length} de {totalItems} registros
                            </span>
                            <div className="flex items-center gap-2">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-400 focus:outline-none"
                                >
                                    {[10, 25, 50, 100].map(size => <option key={size} value={size}>{size} por pág.</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-100 transition-all"
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                            <div className="flex items-center gap-1">
                                {getPageButtons().map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 dark:text-slate-600'}`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-100 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-100 transition-all"
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default PersonList;
