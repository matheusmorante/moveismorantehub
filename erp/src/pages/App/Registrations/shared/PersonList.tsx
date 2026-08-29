import React, { forwardRef, useImperativeHandle, useEffect } from "react";
import PersonTable from "./PersonTable";
import { usePeople } from "./usePeople";
import Person, { PersonVisibilitySettings } from "../../../types/person.type";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { supabase } from '@/pages/utils/supabaseConfig';

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
    const [supplierProductCounts, setSupplierProductCounts] = React.useState<Record<string, number>>({});
    const [confirmModal, setConfirmModal] = React.useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    const {
        people,
        loading,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        handleDelete: onDelete,
        handleRestore,
        handlePermanentDelete: onPermanentDelete,
        selectedPeople,
        toggleSelection,
        selectAll,
        clearSelection,
        handleBulkTrash: onBulkTrash,
        handleBulkRestore,
        handleBulkPermanentDelete: onBulkPermanentDelete,
        toggleActive,
        refresh
    } = usePeople(collectionName, filters);

    useEffect(() => {
        if (collectionName !== 'suppliers') return;
        const loadSupplierProductCounts = async () => {
            const { data, error } = await supabase
                .from('products')
                .select('id, supplier_id, main_supplier_id, supplier_ids')
                .eq('deleted', false)
                .eq('item_type', 'product');
            if (error) {
                console.error('Não foi possível carregar os produtos dos fornecedores:', error);
                return;
            }
            const counts: Record<string, number> = {};
            (data || []).forEach((product) => {
                const supplierIds = new Set([...(product.supplier_ids || []), product.main_supplier_id, product.supplier_id].filter(Boolean));
                supplierIds.forEach((supplierId) => { counts[String(supplierId)] = (counts[String(supplierId)] || 0) + 1; });
            });
            setSupplierProductCounts(counts);
        };
        loadSupplierProductCounts();
    }, [collectionName]);

    // Auto-scroll to top when page changes
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
        scrollContainers.forEach(el => {
            el.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }, [currentPage]);

    // Wrapped handlers for confirmation
    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Mover para Lixeira?",
            message: "O registro ficará inativo mas poderá ser restaurado futuramente a partir da lixeira.",
            onConfirm: () => onDelete(id),
            type: 'warning'
        });
    };

    const handlePermanentDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Permanentemente?",
            message: "Esta ação não pode ser desfeita. Todos os dados deste registro serão removidos do banco de dados.",
            onConfirm: () => onPermanentDelete(id),
            type: 'danger'
        });
    };

    const handleBulkTrash = () => {
        setConfirmModal({
            isOpen: true,
            title: "Mover selecionados para Lixeira?",
            message: `Você está prestes a mover ${selectedPeople.length} registro(s) para a lixeira.`,
            onConfirm: () => onBulkTrash(),
            type: 'warning'
        });
    };

    const handleBulkPermanentDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Permanentemente?",
            message: `Você está prestes a excluir DEFINITIVAMENTE ${selectedPeople.length} registro(s). Esta ação não pode ser desfeita.`,
            onConfirm: () => onBulkPermanentDelete(),
            type: 'danger'
        });
    };

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
                    collectionName={collectionName}
                    supplierProductCounts={supplierProductCounts}
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
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                                title="Página Anterior"
                            >
                                <i className="bi bi-chevron-left text-xs"></i>
                            </button>

                            {/* Slot Esquerdo: Página Anterior */}
                            <div className="w-8 h-8 flex items-center justify-center">
                                {currentPage > 1 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                        className="w-8 h-8 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                                    >
                                        {currentPage - 1}
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30 opacity-20 pointer-events-none" />
                                )}
                            </div>

                            {/* Slot do Meio: Página Atual (Azul, Desativado) */}
                            <div className="w-8 h-8 flex items-center justify-center">
                                <button
                                    type="button"
                                    disabled
                                    className="w-8 h-8 rounded-xl text-xs font-black bg-blue-600 text-white shadow-md shadow-blue-500/20 cursor-default"
                                >
                                    {currentPage}
                                </button>
                            </div>

                            {/* Slot Direito: Página Seguinte */}
                            <div className="w-8 h-8 flex items-center justify-center">
                                {currentPage < totalPages ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                        className="w-8 h-8 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                                    >
                                        {currentPage + 1}
                                    </button>
                                ) : (
                                    <div className="w-8 h-8 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30 opacity-20 pointer-events-none" />
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage >= totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                                title="Próxima Página"
                            >
                                <i className="bi bi-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type={confirmModal.type}
                confirmLabel="Confirmar"
                cancelLabel="Cancelar"
            />
        </div>
    );
});

export default PersonList;
