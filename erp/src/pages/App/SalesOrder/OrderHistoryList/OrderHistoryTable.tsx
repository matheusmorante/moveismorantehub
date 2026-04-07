import React from "react";
import OrderHistoryRow from "./OrderHistoryRow";
import OrderHistoryCard from "./OrderHistoryCard";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { useAutoScroll } from "../../../utils/useAutoScroll";
import { useWindowSize } from "../../../../hooks/useWindowSize";

interface OrderHistoryTableProps {
    orders: Order[];
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onAction: (actionKey: string, order: Order) => void;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    visibilitySettings: VisibilitySettings;
    onToggleColumn: (column: keyof VisibilitySettings) => void;
    showTrash?: boolean;
    filters?: any;
    onSort?: (sortBy: string, sortOrder: 'asc' | 'desc', isMulti: boolean) => void;
    selectedOrders: string[];
    onToggleSelection: (id: string) => void;
    onSelectAll: () => void;
    onBulkTrash: () => void;
    onBulkRestore: () => void;
    onBulkPermanentDelete: () => void;
    onClearSelection: () => void;
    onBlingUpdate?: (id: string, value: boolean) => void;
    highlightOrderId?: string | null;
}

interface ColumnDef {
    key: keyof VisibilitySettings;
    label: string | ((showTrash?: boolean) => string);
    align?: string;
}

const COLUMNS_DEF: ColumnDef[] = [
    { key: 'id', label: 'ID' },
    { key: 'orderDate', label: (trash?: boolean) => trash ? 'Excluído em' : 'Data' },
    { key: 'deliveryDate', label: 'Agendado' },
    { key: 'customer', label: 'Cliente' },
    { key: 'totalValue', label: 'Valor Total', align: 'text-right' },
    { key: 'actions', label: 'Ações', align: 'text-center' },
];

const OrderHistoryTable = ({
    orders, onEdit, onDelete, onRestore, onPermanentDelete, onAction, onStatusUpdate,
    visibilitySettings, onToggleColumn, showTrash, filters, onSort,
    selectedOrders, onToggleSelection, onSelectAll, onBulkTrash, onBulkRestore, onBulkPermanentDelete, onClearSelection,
    onBlingUpdate,
    highlightOrderId
}: OrderHistoryTableProps) => {
    const { width } = useWindowSize();
    const isMobile = width <= 900;
    const containerRef = React.useRef<HTMLDivElement>(null);
    const settings = getSettings();
    const allIdsOnPage = (orders || []).filter(o => o && o.id).map(o => o.id!) as string[];
    const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedOrders.includes(id));
    const isIndeterminate = selectedOrders.length > 0 && !isAllSelected;

    useAutoScroll(containerRef, {
        direction: 'horizontal',
        threshold: (settings as any).autoScroll?.threshold || 100,
        maxSpeed: (settings as any).autoScroll?.speed || 1,
        enabled: settings.autoScroll.orderTable
    });

    const [orderedColumns, setOrderedColumns] = React.useState<ColumnDef[]>(() => {
        const savedOrder = localStorage.getItem('order_table_column_order');
        if (savedOrder) {
            try {
                const keys = JSON.parse(savedOrder) as string[];
                return keys.map(key => COLUMNS_DEF.find(c => c.key === key)!).filter(Boolean);
            } catch (e) {
                return COLUMNS_DEF;
            }
        }
        return COLUMNS_DEF;
    });

    const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null);

    React.useEffect(() => {
        localStorage.setItem('order_table_column_order', JSON.stringify(orderedColumns.map(c => c.key)));
    }, [orderedColumns]);

    // Scroll to highlighted order
    React.useEffect(() => {
        if (highlightOrderId) {
            const element = document.getElementById(`order-row-${highlightOrderId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [highlightOrderId]);

    const handleDragStart = (e: React.DragEvent, key: string) => {
        setDraggedColumn(key);
        e.dataTransfer.setData('columnKey', key);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        const draggedKey = e.dataTransfer.getData('columnKey');
        if (draggedKey === targetKey) return;

        const newOrder = [...orderedColumns];
        const draggedIdx = newOrder.findIndex(c => c.key === draggedKey);
        const targetIdx = newOrder.findIndex(c => c.key === targetKey);

        const [removed] = newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, removed);

        setOrderedColumns(newOrder);
        setDraggedColumn(null);
    };

    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Bulk Actions Toolbar */}
            {selectedOrders.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 flex items-center justify-between shadow-sm animate-slide-up sticky top-2 z-10">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        {selectedOrders.length} <span className="hidden sm:inline">selecionado(s)</span>
                    </span>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={onClearSelection}
                            className="bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-[10px] md:text-xs font-bold px-2 md:px-3 py-1.5 rounded-lg transition-colors"
                        >
                            Sair
                        </button>

                        {!showTrash ? (
                            <button
                                onClick={onBulkTrash}
                                className="bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
                            >
                                <i className="bi bi-trash-fill" />
                                <span className="hidden sm:inline">Mover para Lixeira</span>
                                <span className="sm:hidden">Lixeira</span>
                            </button>
                        ) : (
                                <div className="flex gap-2">
                                <button
                                    onClick={onBulkRestore}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
                                >
                                    <i className="bi bi-arrow-counterclockwise" />
                                        <span className="hidden sm:inline">Restaurar</span>
                                </button>
                                <button
                                    onClick={onBulkPermanentDelete}
                                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
                                >
                                    <i className="bi bi-trash3-fill" />
                                        <span className="hidden sm:inline">Excluir</span>
                                </button>
                                </div>
                        )}
                    </div>
                </div>
            )}

            {/* View Switcher based on isMobile */}
            {!isMobile ? (
                <div ref={containerRef} className="overflow-auto custom-scrollbar rounded-xl border border-slate-100 dark:border-slate-800 flex-1 min-h-0 bg-white dark:bg-slate-900/50 transition-colors">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                                <th className="px-1 py-1 w-10 text-center">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={input => {
                                                if (input) input.indeterminate = isIndeterminate;
                                            }}
                                            onChange={onSelectAll}
                                            className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                                        />
                                    </label>
                                </th>
                                {orderedColumns.map((col) => {
                                    const labelText = typeof col.label === 'function' ? col.label(showTrash) : col.label;
                                    const isVisible = visibilitySettings[col.key];
                                    const sortableKeys = ['id', 'orderDate', 'deliveryDate', 'customer', 'totalValue', 'status'];
                                    const isSortable = sortableKeys.includes(col.key);
                                    // Map keys for the backend
                                    const sortByValueMap: any = { id: 'id', orderDate: 'date', deliveryDate: 'deliveryDate', customer: 'customer', totalValue: 'totalValue', status: 'status' };
                                    const sortByKey = sortByValueMap[col.key];
                                    
                                    const multiSort = filters?.multiSort || [];
                                    const sortIndex = multiSort.findIndex((s: any) => s.key === sortByKey);
                                    const isSorted = sortIndex !== -1;
                                    const activeSort = isSorted ? multiSort[sortIndex] : null;
                                    const sortOrder = activeSort?.order || 'desc';

                                    if (!isVisible) return null;

                                    return (
                                        <th
                                            key={col.key}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, col.key as string)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, col.key as string)}
                                            onDragEnd={() => setDraggedColumn(null)}
                                            className={`px-1 py-1 text-[10px] font-black uppercase tracking-widest transition-all ${col.align || ''} ${draggedColumn === col.key ? 'opacity-20' : 'opacity-100'}`}
                                        >
                                            <div className={`flex items-center gap-1 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                                <div 
                                                    onClick={(e) => {
                                                        if (!isSortable) return;
                                                        e.stopPropagation();
                                                        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                                                        const newOrder = isSorted && sortOrder === 'desc' ? 'asc' : 'desc';
                                                        onSort?.(sortByKey, newOrder, isMulti);
                                                    }}
                                                    className={`flex items-center group/header w-fit cursor-pointer select-none py-1.5 ${isSorted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
                                                >
                                                    <i className="bi bi-grip-vertical text-slate-300 dark:text-slate-700 mr-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                                    <span>{labelText}</span>
                                                    
                                                    {isSorted && (
                                                        <span className="ml-1.5 flex items-center gap-1">
                                                            <i className={`bi ${sortOrder === 'desc' ? 'bi-sort-down' : 'bi-sort-up'} text-xs font-black`}></i>
                                                            {multiSort.length > 1 && (
                                                                <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/40 px-1 rounded-md min-w-[12px] text-center">
                                                                    {sortIndex + 1}
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Hidden Column Option accessible via Right Click or context menu - just showing text for now as per user request to clean UI */}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {orders.map((order) => (
                                <OrderHistoryRow
                                    key={order.id}
                                    order={order}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onRestore={onRestore}
                                    onPermanentDelete={onPermanentDelete}
                                    onAction={onAction}
                                    onStatusUpdate={onStatusUpdate}
                                    visibilitySettings={visibilitySettings}
                                    showTrash={showTrash}
                                    orderedColumnKeys={orderedColumns.map(c => c.key as string)}
                                    isSelected={selectedOrders.includes(order.id!)}
                                    onToggleSelection={() => onToggleSelection(order.id!)}
                                    onBlingUpdate={onBlingUpdate}
                                    isHighlighted={highlightOrderId === order.id}
                                    id={`order-row-${order.id}`}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-4">
                    {orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="bi bi-search text-4xl mb-3 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum pedido encontrado</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <OrderHistoryCard
                                key={order.id}
                                order={order}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onRestore={onRestore}
                                onPermanentDelete={onPermanentDelete}
                                onAction={onAction}
                                onStatusUpdate={onStatusUpdate}
                                showTrash={showTrash}
                                isSelected={selectedOrders.includes(order.id!)}
                                onToggleSelection={() => onToggleSelection(order.id!)}
                                onBlingUpdate={onBlingUpdate}
                                isHighlighted={highlightOrderId === order.id}
                                id={`order-card-${order.id}`}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default OrderHistoryTable;
