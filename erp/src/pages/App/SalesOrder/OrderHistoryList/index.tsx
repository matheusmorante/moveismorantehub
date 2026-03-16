import React from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { useOrderHistory } from "./useOrderHistory";
import OrderHistoryTable from "./OrderHistoryTable";
import StockActionModal from "../OrderActions/StockActionModal";

type OrderHistoryListProps = {
    onEdit: (order: Order) => void;
    filters?: any;
    visibilitySettings: VisibilitySettings;
    onToggleColumn: (column: keyof VisibilitySettings) => void;
    onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    highlightOrderId?: string | null;
};


const OrderHistoryList = ({ onEdit, filters, visibilitySettings, onToggleColumn, onSort, highlightOrderId }: OrderHistoryListProps) => {
    const {
        orders,
        loading,
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleAction,
        handleStatusUpdate,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        selectedOrders,
        toggleSelection,
        selectAll,
        clearSelection,
        handleBulkTrash,
        handleBulkRestore,
        handleBulkPermanentDelete
    } = useOrderHistory(filters);

    const [pageInput, setPageInput] = React.useState(String(currentPage));
    const [stockModal, setStockModal] = React.useState<{ order: Order, type: 'withdrawal' | 'entry' } | null>(null);

    const onAction = (actionKey: string, order: Order) => {
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
            <div className="flex flex-col gap-6">
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
                    highlightOrderId={highlightOrderId}
                />

                {/* Pagination Controls */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-8 border-t border-slate-100 dark:border-slate-800 mt-4 px-2">
                    <div className="flex flex-wrap items-center justify-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 shadow-slate-100/50 dark:shadow-none transition-colors">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentPage === 1 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50/50 dark:bg-slate-950/50'}`}
                            title="Primeira Página"
                        >
                            <i className="bi bi-chevron-double-left text-sm" />
                        </button>
                        <button
                            onClick={() => setCurrentPage((prev: any) => (globalThis as any).Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentPage === 1 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50/50 dark:bg-slate-950/50'}`}
                            title="Anterior"
                        >
                            <i className="bi bi-chevron-left text-sm" />
                        </button>

                        <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block" />

                        <div className="flex gap-1 hidden sm:flex">
                            {((getPageButtons() as any)).map((p: any) => (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' : 'text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 hover:text-blue-600 dark:hover:text-blue-400'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block" />

                        <div className="flex items-center px-4 py-2 bg-slate-50/50 dark:bg-slate-950/50 rounded-xl border border-slate-50 dark:border-slate-800 transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 mr-2">Página</span>
                            <div className="flex items-center gap-1 group">
                                <input
                                    type="text"
                                    value={pageInput}
                                    onChange={handlePageInputChange}
                                    onBlur={handlePageInputBlur}
                                    onKeyDown={handlePageInputKeyDown}
                                    className="w-12 px-2 py-1 text-xs font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 text-center shadow-sm transition-all"
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 mx-1">de</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{totalPages || 1}</span>
                            </div>
                        </div>

                        <div className="h-6 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block" />

                        <button
                            onClick={() => setCurrentPage((prev: any) => (globalThis as any).Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentPage === totalPages || totalPages === 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50/50 dark:bg-slate-950/50'}`}
                            title="Próxima"
                        >
                            <i className="bi bi-chevron-right text-sm" />
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${currentPage === totalPages || totalPages === 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50/50 dark:bg-slate-950/50'}`}
                            title="Última Página"
                        >
                            <i className="bi bi-chevron-double-right text-sm" />
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6">
                        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 dark:text-blue-500">
                                Total: <span className="text-blue-700 dark:text-blue-300 font-black">{totalItems}</span> {totalItems === 1 ? 'pedido' : 'pedidos'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-100/50 dark:shadow-none transition-colors">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">Exibir</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e: any) => setItemsPerPage((globalThis as any).Number(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-1 text-xs font-black text-slate-700 dark:text-slate-300 focus:outline-none transition-all cursor-pointer"
                            >
                                {(([10, 25, 50, 100] as any)).map((size: any) => (
                                    <option key={size} value={size} className="dark:bg-slate-900">{size}</option>
                                ))}
                            </select>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600">por página</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col gap-4">
            {renderContent()}

            {stockModal && (
                <StockActionModal
                    isOpen={!!stockModal}
                    order={stockModal.order}
                    type={stockModal.type}
                    onClose={() => setStockModal(null)}
                />
            )}
        </div>
    );
};

export default OrderHistoryList;
