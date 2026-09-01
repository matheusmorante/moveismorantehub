import React, { forwardRef, useImperativeHandle } from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { useOrderHistory } from "./useOrderHistory";
import OrderHistoryTable from "./OrderHistoryTable";
import StockActionModal from "../OrderActions/StockActionModal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import ReturnFulfillmentConfirmModal from "./ReturnFulfillmentConfirmModal";
import OrderPagination from "./OrderPagination";

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

const OrderHistoryList = forwardRef<OrderHistoryListRef, OrderHistoryListProps>(({ 
    onEdit, 
    onViewDetails, 
    onShowPostSaleActions, 
    filters, 
    visibilitySettings, 
    onToggleColumn, 
    onSort, 
    highlightOrderId, 
    onFilterByOrderId, 
    onAction: onActionProp 
}, ref) => {
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
        setCurrentPage
    } = useOrderHistory(filters);

    // Auto-scroll para o início da lista ao mudar de página
    React.useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
        scrollContainers.forEach(el => {
            el.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }, [currentPage]);

    // Handlers para confirmação modal
    const handleDelete = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: "Excluir rascunho?",
            message: "Esta ação não pode ser desfeita. O rascunho será removido permanentemente.",
            onConfirm: () => onDelete(id),
            type: 'danger'
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

    const [stockModal, setStockModal] = React.useState<{ order: Order, type: 'withdrawal' | 'entry' } | null>(null);

    const onAction = (actionKey: string, order: Order) => {
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
        if (loading && orders.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                    <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-500 rounded-full animate-spin"></div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-slate-400 dark:text-slate-600 font-bold tracking-widest uppercase text-xs">
                            Carregando pedidos da nuvem...
                        </p>
                        {showTroubleshoot && (
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight opacity-75">
                                Demorando muito? Verifique a conexão ou o Console (F12)
                            </p>
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

                {/* Controles de Paginação (Lá em baixo, para tabela e cards) */}
                <OrderPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={30}
                    onPageChange={setCurrentPage}
                    loading={loading}
                />
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

            {pendingReturnFulfillment && (
                <ReturnFulfillmentConfirmModal 
                    order={pendingReturnFulfillment} 
                    onCancel={cancelReturnFulfillment} 
                    onConfirm={confirmReturnFulfillment} 
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
