import React from "react";
import OrderHistoryRow from "./OrderHistoryRow";
import OrderHistoryCard from "./OrderHistoryCard";
import Order, { AssistanceItem, VisibilitySettings } from "../../../types/order.type";
import { Item } from "../../../types/items.type";
import { getSettings } from '@/pages/utils/settingsService';
import { useAutoScroll } from "../../../utils/useAutoScroll";
import { useWindowSize } from "../../../../hooks/useWindowSize";

import { OrderTableHeader, COLUMNS_DEF, ColumnDef, OrderHistoryFilters } from "./OrderTableHeader";

export interface OrderHistoryTableProps {
    readonly orders: readonly Order[];
    readonly onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    readonly onViewDetails?: (order: Order) => void;
    readonly onDelete: (id: string) => void;
    readonly onRestore: (id: string) => void;
    readonly onPermanentDelete: (id: string) => void;
    readonly onAction: (actionKey: string, order: Order) => void;
    readonly onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    readonly visibilitySettings: VisibilitySettings;
    readonly onToggleColumn?: (column: keyof VisibilitySettings) => void;
    readonly showTrash?: boolean;
    readonly filters?: OrderHistoryFilters;
    readonly onSort?: (sortBy: string, sortOrder: 'asc' | 'desc', isMulti: boolean) => void;
    readonly selectedOrders: readonly string[];
    readonly onToggleSelection: (id: string) => void;
    readonly onSelectAll?: () => void;
    readonly onBulkTrash?: () => void;
    readonly onBulkRestore?: () => void;
    readonly onBulkPermanentDelete?: () => void;
    readonly onClearSelection?: () => void;
    readonly onBlingUpdate?: (id: string, value: boolean) => void;
    readonly onStockCheckUpdate?: (id: string, value: boolean, updatedItems?: readonly Item[], updatedAssistanceItems?: readonly AssistanceItem[]) => void;
    readonly highlightOrderId?: string | null;
    readonly onFilterByOrderId?: (id: string) => void;
    readonly onShowPostSaleActions?: (order: Order) => void;
}

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

    const isReturnOnly = orders.length > 0 && orders.every(order => order.orderType === 'return');

    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* View Switcher based on isMobile */}
            {!isMobile ? (
                <div ref={containerRef} className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 transition-colors">
                    <table className="w-full text-left border-collapse">
                        <OrderTableHeader
                            columns={columnsToRender}
                            visibilitySettings={visibilitySettings}
                            showTrash={showTrash}
                            filters={filters}
                            onSort={onSort}
                            draggedColumn={draggedColumn}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onDragEnd={() => setDraggedColumn(null)}
                            isReturnOnly={isReturnOnly}
                        />
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
