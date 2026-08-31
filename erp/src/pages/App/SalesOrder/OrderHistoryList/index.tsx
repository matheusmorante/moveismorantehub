import React, { forwardRef, useImperativeHandle } from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { useOrderHistory } from "./useOrderHistory";
import OrderHistoryTable from "./OrderHistoryTable";
import StockActionModal from "../OrderActions/StockActionModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ReturnFulfillmentConfirmModal from "./ReturnFulfillmentConfirmModal";

type OrderHistoryListProps = {
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    onViewDetails?: (order: Order) => void;
    onShowPostSaleActions?: (order: Order) => void;
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


const OrderHistoryList = forwardRef<OrderHistoryListRef, OrderHistoryListProps>(({ onEdit, onViewDetails, onShowPostSaleActions, filters, visibilitySettings, onToggleColumn, onSort, highlightOrderId, onFilterByOrderId, onAction: onActionProp }, ref) => {
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
        pendingReturnFulfillment,
        confirmReturnFulfillment,
        cancelReturnFulfillment,
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
        refresh,
        currentPage,
        totalPages,
        setCurrentPage,
        loadingMore,
        useInfiniteScroll
    } = useOrderHistory(filters);

    // Auto-scroll to top when page changes
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
        scrollContainers.forEach(el => {
            el.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }, [currentPage]);

    // IntersectionObserver for infinite scroll in Card View
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
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const start = currentPage <= 3
            ? 1
            : currentPage >= totalPages - 2
                ? totalPages - maxVisible + 1
                : currentPage - 2;

        return Array.from({ length: maxVisible }, (_, index) => start + index);
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
            <div className="flex flex-col gap-4 flex-1">
                <OrderHistoryTable
                    orders={orders}
                    onEdit={onEdit}
                    onViewDetails={onViewDetails}
                    onShowPostSaleActions={onShowPostSaleActions}
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

                {!useInfiniteScroll && (
                <div className="flex items-center justify-between flex-wrap gap-4 py-6 px-4 border-t border-slate-100 dark:border-slate-800 mb-4">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        {loading && <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
                        Página {currentPage} de {totalPages} · {totalItems} pedidos
                    </span>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                        >
                            Anterior
                        </button>

                        {/* Slot Esquerdo: Página Anterior */}
                        <div className="w-9 h-9 flex items-center justify-center">
                            {currentPage > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(currentPage - 1)}
                                    className="w-9 h-9 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                                >
                                    {currentPage - 1}
                                </button>
                            ) : (
                                <div className="w-9 h-9 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30 opacity-20 pointer-events-none" />
                            )}
                        </div>

                        {/* Slot do Meio: Página Atual (Azul, Desativado) */}
                        <div className="w-9 h-9 flex items-center justify-center">
                            <button
                                type="button"
                                disabled
                                className="w-9 h-9 rounded-xl text-xs font-black bg-blue-600 text-white shadow-md shadow-blue-500/20 cursor-default"
                            >
                                {currentPage}
                            </button>
                        </div>

                        {/* Slot Direito: Página Seguinte */}
                        <div className="w-9 h-9 flex items-center justify-center">
                            {currentPage < totalPages ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentPage(currentPage + 1)}
                                    className="w-9 h-9 rounded-xl text-xs font-black border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all cursor-pointer"
                                >
                                    {currentPage + 1}
                                </button>
                            ) : (
                                <div className="w-9 h-9 rounded-xl border border-slate-100 dark:border-slate-800/40 bg-slate-50/30 dark:bg-slate-900/30 opacity-20 pointer-events-none" />
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all"
                        >
                            Próxima
                        </button>
                    </div>
                </div>
                )}

                {/* Infinite Scroll Sentinel */}
                {useInfiniteScroll && (
                <div ref={sentinelRef} className="py-6 flex flex-col items-center justify-center gap-2 border-t border-slate-100 dark:border-slate-800 mt-3">
                    {hasMore ? (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold animate-pulse">
                            {loadingMore && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                            <span>{loadingMore ? 'Carregando mais pedidos...' : `${orders.length} de ${totalItems} pedidos`}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-900 px-4 py-1.5 rounded-full border border-slate-200 dark:border-slate-800">
                            Todos os {totalItems} pedidos carregados 👌
                        </span>
                    )}
                </div>
                )}
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

            {pendingReturnFulfillment && <ReturnFulfillmentConfirmModal order={pendingReturnFulfillment} onCancel={cancelReturnFulfillment} onConfirm={confirmReturnFulfillment} />}

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
