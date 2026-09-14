import React from "react";
import OrderHistoryRow from "./OrderHistoryRow";
import OrderHistoryCard from "./OrderHistoryCard";
import Order, { AssistanceItem, VisibilitySettings } from "../../../types/order.type";
import { Item } from "../../../types/items.type";
import { getSettings } from '@/pages/utils/settingsService';
import { useAutoScroll } from "../../../utils/useAutoScroll";
import { useWindowSize } from "../../../../hooks/useWindowSize";

interface SortItem {
    readonly key: string;
    readonly order: 'asc' | 'desc';
}

interface OrderHistoryFilters {
    readonly multiSort?: readonly SortItem[];
    readonly [key: string]: unknown;
}

interface OrderHistoryTableProps {
    readonly orders: readonly Order[];
    readonly onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    readonly onViewDetails?: (order: Order) => void;
    readonly onDelete: (id: string) => void;
    readonly onRestore: (id: string) => void;
    readonly onPermanentDelete: (id: string) => void;
    readonly onAction: (actionKey: string, order: Order) => void;
    readonly onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    readonly visibilitySettings: VisibilitySettings;
    readonly onToggleColumn: (column: keyof VisibilitySettings) => void;
    readonly showTrash?: boolean;
    readonly filters?: OrderHistoryFilters;
    readonly onSort?: (sortBy: string, sortOrder: 'asc' | 'desc', isMulti: boolean) => void;
    readonly selectedOrders: readonly string[];
    readonly onToggleSelection: (id: string) => void;
    readonly onSelectAll: () => void;
    readonly onBulkTrash: () => void;
    readonly onBulkRestore: () => void;
    readonly onBulkPermanentDelete: () => void;
    readonly onClearSelection: () => void;
    readonly onBlingUpdate?: (id: string, value: boolean) => void;
    readonly onStockCheckUpdate?: (id: string, value: boolean, updatedItems?: readonly Item[], updatedAssistanceItems?: readonly AssistanceItem[]) => void;
    readonly highlightOrderId?: string | null;
    readonly onFilterByOrderId?: (id: string) => void;
    readonly onShowPostSaleActions?: (order: Order) => void;
}

interface ColumnDef {
    key: keyof VisibilitySettings;
    label: string | ((showTrash?: boolean) => string);
    align?: string;
}

const COLUMNS_DEF: ColumnDef[] = [
    { key: 'id', label: 'Código' },
    { key: 'orderDate', label: (trash?: boolean) => trash ? 'Excluído em' : 'Data' },
    { key: 'deliveryDate', label: 'Agendado' },
    { key: 'customer', label: 'Cliente' },
    { key: 'totalValue', label: 'Valor Total', align: 'text-right' },
    { key: 'actions', label: 'Ações', align: 'text-center' },
];

const OrderHistoryTable = ({
    orders, onEdit, onViewDetails, onDelete, onRestore, onPermanentDelete, onAction, onStatusUpdate,
    visibilitySettings, showTrash, filters, onSort,
    selectedOrders, onToggleSelection,
    onBlingUpdate,
    onStockCheckUpdate,
    highlightOrderId,
    onFilterByOrderId,
    onShowPostSaleActions
}: OrderHistoryTableProps) => {
    const { width } = useWindowSize();
    const isMobile = width < 1024 || 
                     window.location.search.includes('auth_email') || 
                     window.location.pathname.includes('/mobile') || 
                     Boolean((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const settings = getSettings();

    useAutoScroll(containerRef, {
        direction: 'horizontal',
        threshold: (settings as { autoScroll?: { threshold?: number; speed?: number; orderTable?: boolean } }).autoScroll?.threshold || 100,
        maxSpeed: (settings as { autoScroll?: { threshold?: number; speed?: number; orderTable?: boolean } }).autoScroll?.speed || 1,
        enabled: settings.autoScroll?.orderTable ?? false
    });

    const [orderedColumns, setOrderedColumns] = React.useState<ColumnDef[]>(() => {
        const savedOrder = localStorage.getItem('order_table_column_order');
        if (savedOrder) {
            try {
                const keys = JSON.parse(savedOrder) as string[];
                const savedColumns = keys.map(key => COLUMNS_DEF.find(c => c.key === key)!).filter(Boolean);
                const savedKeys = new Set(savedColumns.map(column => column.key));
                const missingColumns = COLUMNS_DEF.filter(column => !savedKeys.has(column.key));
                return savedColumns.length > 0 ? [...savedColumns, ...missingColumns] : COLUMNS_DEF;
            } catch {
                return COLUMNS_DEF;
            }
        }
        return COLUMNS_DEF;
    });

    const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null);
    const columnsToRender = orderedColumns.length > 0 ? orderedColumns : COLUMNS_DEF;

    React.useEffect(() => {
        localStorage.setItem('order_table_column_order', JSON.stringify(columnsToRender.map(c => c.key)));
    }, [orderedColumns, columnsToRender]);

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
            {/* View Switcher based on isMobile */}
            {!isMobile ? (
                <div ref={containerRef} className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 transition-colors">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                                {columnsToRender.map((col) => {
                                    const labelText = col.key === 'deliveryDate' && orders.length > 0 && orders.every(order => order.orderType === 'return')
                                        ? 'Data de coleta'
                                        : (typeof col.label === 'function' ? col.label(showTrash) : col.label);
                                    const isVisible = visibilitySettings[col.key] !== false;
                                    const sortableKeys = ['id', 'orderDate', 'deliveryDate', 'customer', 'totalValue', 'status'];
                                    const isSortable = sortableKeys.includes(col.key);
                                    // Map keys for the backend
                                    const sortByValueMap: Partial<Record<keyof VisibilitySettings, string>> = {
                                        id: 'id',
                                        orderDate: 'date',
                                        deliveryDate: 'deliveryDate',
                                        customer: 'customer',
                                        totalValue: 'totalValue',
                                        actions: undefined
                                    };
                                    const sortByKey = sortByValueMap[col.key] ?? (col.key as string);
                                    
                                    const multiSort = filters?.multiSort || [];
                                    const sortIndex = multiSort.findIndex((s) => s.key === sortByKey);
                                    const isSorted = sortIndex !== -1;
                                    const activeSort = isSorted ? multiSort[sortIndex] : null;
                                    const sortOrder = activeSort?.order || 'desc';

                                    if (!isVisible) return null;

                                    const handleSortClick = (e: React.MouseEvent | React.KeyboardEvent) => {
                                        if (!isSortable) return;
                                        e.stopPropagation();
                                        const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                                        const newOrder = isSorted && sortOrder === 'desc' ? 'asc' : 'desc';
                                        onSort?.(sortByKey, newOrder, isMulti);
                                    };

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
                                                    role={isSortable ? "button" : undefined}
                                                    tabIndex={isSortable ? 0 : undefined}
                                                    onClick={isSortable ? handleSortClick : undefined}
                                                    onKeyDown={isSortable ? (e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            handleSortClick(e);
                                                        }
                                                    } : undefined}
                                                    className={`flex items-center group/header w-fit ${isSortable ? 'cursor-pointer select-none' : 'cursor-default'} py-1.5 ${isSorted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400'}`}
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
                                    onViewDetails={onViewDetails}
                                    onDelete={onDelete}
                                    onRestore={onRestore}
                                    onPermanentDelete={onPermanentDelete}
                                    onAction={onAction}
                                    onStatusUpdate={onStatusUpdate}
                                    visibilitySettings={visibilitySettings}
                                    showTrash={showTrash}
                                    orderedColumnKeys={columnsToRender.map(c => c.key as string)}
                                    isSelected={selectedOrders.includes(order.id!)}
                                    onToggleSelection={() => onToggleSelection(order.id!)}
                                    onBlingUpdate={onBlingUpdate}
                                    onStockCheckUpdate={onStockCheckUpdate}
                                    isHighlighted={highlightOrderId === order.id}
                                    id={`order-row-${order.id}`}
                                    onFilterByOrderId={onFilterByOrderId}
                                    onShowPostSaleActions={onShowPostSaleActions}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 auto-rows-max gap-4 pb-4">
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
                                onViewDetails={onViewDetails}
                                onDelete={onDelete}
                                onRestore={onRestore}
                                onPermanentDelete={onPermanentDelete}
                                onAction={onAction}
                                onStatusUpdate={onStatusUpdate}
                                showTrash={showTrash}
                                isSelected={selectedOrders.includes(order.id!)}
                                onToggleSelection={() => onToggleSelection(order.id!)}
                                onBlingUpdate={onBlingUpdate}
                                onStockCheckUpdate={onStockCheckUpdate}
                                isHighlighted={highlightOrderId === order.id}
                                id={`order-card-${order.id}`}
                                onFilterByOrderId={onFilterByOrderId}
                                onShowPostSaleActions={onShowPostSaleActions}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default OrderHistoryTable;
