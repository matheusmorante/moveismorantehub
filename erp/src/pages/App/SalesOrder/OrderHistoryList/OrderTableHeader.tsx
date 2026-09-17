import React from "react";
import { VisibilitySettings } from "../../../types/order.type";

export interface SortItem {
    readonly key: string;
    readonly order: 'asc' | 'desc';
}

export interface OrderHistoryFilters {
    readonly multiSort?: readonly SortItem[];
    readonly [key: string]: unknown;
}

export interface ColumnDef {
    key: keyof VisibilitySettings;
    label: string | ((showTrash?: boolean) => string);
    align?: string;
}

export const COLUMNS_DEF: ColumnDef[] = [
    { key: 'id', label: 'Código' },
    { key: 'orderDate', label: (trash?: boolean) => trash ? 'Excluído em' : 'Data' },
    { key: 'deliveryDate', label: 'Agendado' },
    { key: 'customer', label: 'Cliente' },
    { key: 'totalValue', label: 'Valor Total', align: 'text-right' },
    { key: 'actions', label: 'Ações', align: 'text-center' },
];

export interface OrderTableHeaderProps {
    readonly columns: readonly ColumnDef[];
    readonly visibilitySettings: VisibilitySettings;
    readonly showTrash?: boolean;
    readonly filters?: OrderHistoryFilters;
    readonly onSort?: (sortBy: string, sortOrder: 'asc' | 'desc', isMulti: boolean) => void;
    readonly draggedColumn: string | null;
    readonly onDragStart: (e: React.DragEvent, key: string) => void;
    readonly onDragOver: (e: React.DragEvent) => void;
    readonly onDrop: (e: React.DragEvent, key: string) => void;
    readonly onDragEnd: () => void;
    readonly isReturnOnly?: boolean;
}

/**
 * Cabeçalho de colunas reordenáveis e ordenáveis da tabela de histórico de pedidos.
 * Princípio SRP: focado exclusivamente no layout e eventos das colunas da tabela.
 */
export const OrderTableHeader: React.FC<OrderTableHeaderProps> = ({
    columns,
    visibilitySettings,
    showTrash,
    filters,
    onSort,
    draggedColumn,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isReturnOnly
}) => {
    return (
        <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
                {columns.map((col) => {
                    const labelText = col.key === 'deliveryDate' && isReturnOnly
                        ? 'Data de coleta'
                        : (typeof col.label === 'function' ? col.label(showTrash) : col.label);
                    const isVisible = visibilitySettings[col.key] !== false;
                    const sortableKeys = ['id', 'orderDate', 'deliveryDate', 'customer', 'totalValue', 'status'];
                    const isSortable = sortableKeys.includes(col.key);

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
                            onDragStart={(e) => onDragStart(e, col.key as string)}
                            onDragOver={onDragOver}
                            onDrop={(e) => onDrop(e, col.key as string)}
                            onDragEnd={onDragEnd}
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
                                            <i className={`bi ${sortOrder === 'desc' ? 'bi-sort-down' : 'bi-sort-up'} text-xs font-black`} />
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
    );
};
