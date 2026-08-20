import React, { forwardRef, useImperativeHandle } from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { useOrderHistory } from "./useOrderHistory";
import OrderHistoryTable from "./OrderHistoryTable";
import StockActionModal from "../OrderActions/StockActionModal";
import ConfirmModal from "@/components/shared/ConfirmModal";

type OrderHistoryListProps = {
    onEdit: (order: Order) => void;
    filters?: any;
    visibilitySettings: VisibilitySettings;
    onToggleColumn: (column: keyof VisibilitySettings) => void;
    onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    highlightOrderId?: string | null;
    onFilterByOrderId?: (id: string) => void;
    onAction?: (actionKey: string, order: Order) => void;
};

export interface OrderHistoryListRef {
    refresh: () => void;
}


const OrderHistoryList = forwardRef<OrderHistoryListRef, OrderHistoryListProps>(({ onEdit, filters, visibilitySettings, onToggleColumn, onSort, highlightOrderId, onFilterByOrderId, onAction: onActionProp }, ref) => {
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
        orders,
        loading,
        handleDelete: onDelete,
        handleRestore,
        handlePermanentDelete: onPermanentDelete,
        handleAction,
        handleStatusUpdate,
        totalItems,
        hasMore,
        loadMore,
        selectedOrders,
        toggleSelection,
        selectAll,
        clearSelection,
        handleBulkTrash: onBulkTrash,
        handleBulkRestore,
        handleBulkPermanentDelete: onBulkPermanentDelete,
        handleBlingUpdate,
        handleStockCheckUpdate,
        refresh
    } = useOrderHistory(filters);

    const observerRef = React.useRef<IntersectionObserver | null>(null);
    const sentinelRef = React.useCallback((node: HTMLDivElement | null) => {
        if (loading) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        }, { threshold: 0.1 });
        if (node) observerRef.current.observe(node);
    }, [loading, hasMore, loadMore]);
    
    // Wrapped handlers for confirmation
    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Mover para Lixeira?",
            message: "O pedido ficará inativo mas poderá ser restaurado futuramente a partir da lixeira.",
            onConfirm: () => onDelete(id),
            type: 'warning'
        });
    };

    const handlePermanentDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Permanentemente?",
            message: "Esta ação não pode ser desfeita. Todos os dados deste pedido serão removidos definitivamente.",
            onConfirm: () => onPermanentDelete(id),
            type: 'danger'
        });
    };

    const handleBulkTrash = () => {
        setConfirmModal({
            isOpen: true,
            title: "Mover selecionados para Lixeira?",
            message: `Você está prestes a mover ${selectedOrders.length} pedido(s) para a lixeira.`,
            onConfirm: () => onBulkTrash(),
            type: 'warning'
        });
    };

    const handleBulkPermanentDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir Permanentemente?",
            message: `Você está prestes a excluir DEFINITIVAMENTE ${selectedOrders.length} pedido(s). Esta ação não pode ser desfeita.`,
            onConfirm: () => onBulkPermanentDelete(),
            type: 'danger'
        });
    };

    useImperativeHandle(ref, () => ({
        refresh
    }));

    const [pageInput, setPageInput] = React.useState(String(currentPage));
    const [stockModal, setStockModal] = React.useState<{ order: Order, type: 'withdrawal' | 'entry' } | null>(null);

    const onAction = (actionKey: string, order: Order) => {
        // External listener first
        if (onActionProp) {
            onActionProp(actionKey, order);
        }

        if (actionKey === 'stockWithdrawal') {
            setStockModal({ order, type: 'withdrawal' });
            return;
        }
        if (actionKey === 'stockReversal') {
            setStockModal({ order, type: 'entry' });
            return;
        }
        handleAction(actionKey, order);
    };

    React.useEffect(() => {
        setPageInput(String(currentPage));
    }, [currentPage]);

    const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPageInput(e.target.value);
    };

    const handlePageInputBlur = () => {
        const val = parseInt(pageInput, 10);
        if (!isNaN(val) && val >= 1 && val <= totalPages) {
            setCurrentPage(val);
        } else {
            setPageInput(String(currentPage));
        }
    };

    const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handlePageInputBlur();
        }
    };

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


    const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

    React.useEffect(() => {
        if (loading) {
            const timer = setTimeout(() => setShowTroubleshoot(true), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowTroubleshoot(false);
        }
    }, [loading]);

    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
                            Carregando pedidos da nuvem...
                        </p>
                        {showTroubleshoot && (
                            <button
                                onClick={() => {
                                    (globalThis as any).console.warn('User forced loading end');
                                    // We can't set loading directly here as it's from hook, 
                                    // but we can at least show a message or wait for the hook's failsafe.
                                    // Let's modify the hook to return a force function if needed, 
                                    // but for now, let's just show a tip.
                                }}
                                className="text-[10px] text-blue-500 underline hover:text-blue-600 font-bold uppercase tracking-tight opacity-50 hover:opacity-100 transition-opacity"
                            >
                                Demorando muito? Verifique o Console (F12)
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        if (orders.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center">
                        <i className={`bi ${filters?.showTrash ? 'bi-trash3' : 'bi-search'} text-3xl text-slate-200 dark:text-slate-800`}></i>
                    </div>
                    <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
                        {filters?.showTrash ? 'A lixeira está vazia' : 'Nenhum pedido encontrado'}
                    </p>
                </div>
            );
        }

        return (
            <div className="flex flex-col gap-4 flex-1 min-h-0">
                <OrderHistoryTable
                    orders={orders}
                    onEdit={onEdit}
                    onDelete={handleDelete}
                    onRestore={handleRestore}
                    onPermanentDelete={handlePermanentDelete}
                    onAction={onAction}
                    onStatusUpdate={handleStatusUpdate}
                    visibilitySettings={visibilitySettings}
                    onToggleColumn={onToggleColumn}
                    showTrash={filters?.showTrash}
                    filters={filters}
                    onSort={onSort}
                    selectedOrders={selectedOrders}
                    onToggleSelection={toggleSelection}
                    onSelectAll={selectAll}
                    onClearSelection={clearSelection}
                    onBulkTrash={handleBulkTrash}
                    onBulkRestore={handleBulkRestore}
                    onBulkPermanentDelete={handleBulkPermanentDelete}
                    onBlingUpdate={handleBlingUpdate}
                    onStockCheckUpdate={handleStockCheckUpdate}
                    highlightOrderId={highlightOrderId}
                    onFilterByOrderId={onFilterByOrderId}
                />

                {/* Infinite Scroll Sentinel */}
                <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-3">
                    {hasMore ? (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold animate-pulse">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <span>Carregando mais pedidos... ({orders.length} de {totalItems})</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                            Todos os {totalItems} pedidos carregados 👌
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col gap-4 flex-1 min-h-0">
            {renderContent()}

            {stockModal && (
                <StockActionModal
                    isOpen={!!stockModal}
                    order={stockModal.order}
                    type={stockModal.type}
                    onClose={() => setStockModal(null)}
                />
            )}

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

export default OrderHistoryList;
