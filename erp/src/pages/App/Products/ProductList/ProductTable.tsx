import React from "react";
import ProductRow from "./ProductRow";
import ProductCard from "./ProductCard";
import Product, { ProductVisibilitySettings } from "../../../types/product.type";
import { useAutoScroll } from "../../../utils/useAutoScroll";
import { getSettings } from '@/pages/utils/settingsService';
import { useWindowSize } from "../../../../hooks/useWindowSize";

interface ProductTableProps {
    products: Product[];
    onEdit: (product: Product) => void;
    onShowHistory?: (product: Product) => void;
    onLaunchStock?: (product: any) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onToggleActive: (id: string, currentStatus: boolean) => void;
    onDeactivateCatalog: (id: string) => void;
    visibilitySettings: ProductVisibilitySettings;
    onToggleColumn: (column: keyof ProductVisibilitySettings) => void;
    showTrash?: boolean;
    filters?: any;
    onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
    selectedProducts: string[];
    onToggleSelection: (id: string) => void;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBulkTrash: () => void;
    onBulkRestore: () => void;
    onBulkPermanentDelete: () => void;
    categoryTree?: any;
    onRefresh?: () => void;
    onDuplicate?: (product: Product) => void;
}

interface ColumnDef {
    key: keyof ProductVisibilitySettings;
    label: string;
    align?: string;
}

const COLUMNS_DEF: ColumnDef[] = [
    { key: 'code', label: 'SKU' },
    { key: 'description', label: 'Produto/Variação' },
    { key: 'category', label: 'Categoria' },
    { key: 'unitPrice', label: 'Preço Venda', align: 'text-right' },
    { key: 'weight', label: 'Peso', align: 'text-right' },
    { key: 'stock', label: 'Estoque', align: 'text-center' },
    { key: 'status', label: 'Canais', align: 'text-center' },
    { key: 'actions', label: 'Ações', align: 'text-center' },
];

const ProductTable = ({
    products, onEdit, onShowHistory, onLaunchStock, onDelete, onRestore, onPermanentDelete, onToggleActive, onDeactivateCatalog,
    visibilitySettings, onToggleColumn, showTrash, filters, onSort,
    selectedProducts, onToggleSelection, onSelectAll, onClearSelection,
    onBulkTrash, onBulkRestore, onBulkPermanentDelete, categoryTree, onRefresh, onDuplicate
}: ProductTableProps) => {
    const { width } = useWindowSize();
    const isMobile = width < 1280 || 
                     window.location.search.includes('auth_email') || 
                     window.location.pathname.includes('/mobile') || 
                     Boolean((window as any).ReactNativeWebView);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const settings = getSettings();

    const allIdsOnPage = products.map(p => p.id!).filter(Boolean);
    const isAllSelected = allIdsOnPage.length > 0 && allIdsOnPage.every(id => selectedProducts.includes(id));
    const isIndeterminate = selectedProducts.length > 0 && !isAllSelected;

    useAutoScroll(containerRef, {
        direction: 'horizontal',
        threshold: (settings as any).autoScroll?.threshold || 100,
        maxSpeed: (settings as any).autoScroll?.speed || 1,
        enabled: settings.autoScroll.orderTable // Reusing orderTable setting for now
    });

    const [orderedColumns, setOrderedColumns] = React.useState<ColumnDef[]>(() => {
        const savedOrder = localStorage.getItem('product_table_column_order');
        if (savedOrder) {
            try {
                const keys = JSON.parse(savedOrder) as string[];
                const existingColumns = keys.map(key => COLUMNS_DEF.find(c => c.key === key)!).filter(Boolean);
                const missingColumns = COLUMNS_DEF.filter(c => !keys.includes(c.key));
                return [...existingColumns, ...missingColumns];
            } catch (e) {
                return COLUMNS_DEF;
            }
        }
        return COLUMNS_DEF;
    });

    const [draggedColumn, setDraggedColumn] = React.useState<string | null>(null);

    React.useEffect(() => {
        localStorage.setItem('product_table_column_order', JSON.stringify(orderedColumns.map(c => c.key)));
    }, [orderedColumns]);

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

    const finalProducts = React.useMemo(() => {
        return products;
    }, [products]);

    return (
        <div className="flex flex-col gap-4">
            {/* Bulk Actions Toolbar */}
            {selectedProducts.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-xl p-4 flex items-center justify-between shadow-sm animate-slide-up sticky top-2 z-10">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        {selectedProducts.length} <span className="hidden sm:inline">selecionado(s)</span>
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
                                className="bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2"
                            >
                                <i className="bi bi-power" />
                                <span className="hidden sm:inline">Desativar Selecionados</span>
                                <span className="sm:hidden">Desativar</span>
                            </button>
                        ) : (
                            <button
                                onClick={onBulkRestore}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 font-bold"
                            >
                                <i className="bi bi-check-circle-fill" />
                                <span className="hidden sm:inline">Ativar Selecionados</span>
                                <span className="sm:hidden">Ativar</span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* View Switcher based on isMobile */}
            {!isMobile ? (
                <div ref={containerRef} className="overflow-x-auto overflow-y-auto max-h-[70vh] custom-scrollbar rounded-xl border border-slate-100 dark:border-slate-800">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-900">
                            <tr className="border-b border-slate-100 dark:border-slate-800 transition-colors">
                                {orderedColumns.map((col) => {
                                    const isVisible = visibilitySettings[col.key];
                                    const sortableKeys = ['code', 'description', 'unitPrice', 'stock', 'status', 'category'];
                                    const isSortable = sortableKeys.includes(col.key);
                                    const isSorted = filters?.sortBy === col.key;
                                    const sortOrder = filters?.sortOrder || 'asc';

                                    if (!isVisible) return null;

                                    return (
                                        <th
                                            key={col.key}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, col.key as string)}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, col.key as string)}
                                            onDragEnd={() => setDraggedColumn(null)}
                                            className={`px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 transition-all ${col.align || ''} ${draggedColumn === col.key ? 'opacity-20' : 'opacity-100'} ${col.key === 'code' ? 'w-[1%] whitespace-nowrap' : ''}`}
                                        >
                                            <div className={`flex items-center gap-2 ${col.align === 'text-right' ? 'justify-end' : col.align === 'text-center' ? 'justify-center' : ''}`}>
                                                <div className="flex items-center group/header w-fit cursor-grab active:cursor-grabbing">
                                                    <i className="bi bi-grip-vertical text-slate-300 dark:text-slate-700 mr-1 opacity-0 group-hover/header:opacity-100 transition-opacity" />
                                                    <span>{col.label}</span>
                                                </div>

                                                {isSortable && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newOrder = isSorted && sortOrder === 'asc' ? 'desc' : 'asc';
                                                            onSort?.(col.key, newOrder);
                                                        }}
                                                        className={`ml-2 flex items-center transition-all ${isSorted ? 'text-blue-600 dark:text-blue-400 scale-150' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
                                                        title={isSorted ? (sortOrder === 'asc' ? 'Ordenando: Crescente' : 'Ordenando: Decrescente') : `Clique para ordenar por ${col.label}`}
                                                    >
                                                        {isSorted ? (
                                                            <i className={`bi ${sortOrder === 'asc' ? 'bi-sort-up' : 'bi-sort-down'} text-sm font-black`}></i>
                                                        ) : (
                                                            <i className="bi bi-arrow-down-up text-xs font-bold"></i>
                                                        )}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onToggleColumn(col.key); }}
                                                    className="p-1 text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded ml-1"
                                                    title={`Ocultar ${col.label}`}
                                                >
                                                    <i className="bi bi-eye-slash text-sm" />
                                                </button>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {finalProducts.map((product) => (
                                <ProductRow
                                    key={product.id}
                                    product={product}
                                    onEdit={onEdit}
                                    onShowHistory={onShowHistory}
                                    onLaunchStock={onLaunchStock}
                                    onDelete={() => onDelete(product.id || '')}
                                    onRestore={() => onRestore(product.id || '')}
                                    onPermanentDelete={() => onPermanentDelete(product.id || '')}
                                    onToggleActive={(id, status) => onToggleActive(product.id || '', product.active)}
                                    onDeactivateCatalog={onDeactivateCatalog}
                                    visibilitySettings={visibilitySettings}
                                    showTrash={showTrash}
                                    orderedColumnKeys={orderedColumns.map(c => c.key as string)}
                                    isSelected={selectedProducts.includes(product.id || '')}
                                    onToggleSelection={() => onToggleSelection(product.id || '')}
                                    categoryTree={categoryTree}
                                    onRefresh={onRefresh}
                                    onDuplicate={() => onDuplicate && onDuplicate(product)}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="flex flex-col gap-4 overflow-y-auto pb-4">
                    {finalProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <i className="bi bi-search text-4xl mb-3 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Nenhum produto encontrado</p>
                        </div>
                    ) : (
                        finalProducts
                            .filter(product => !product.parentId && !product.isVariation)
                            .map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    onEdit={onEdit}
                                    onShowHistory={onShowHistory}
                                    onLaunchStock={onLaunchStock}
                                    onDelete={onDelete}
                                    onRestore={onRestore}
                                    onPermanentDelete={onPermanentDelete}
                                    onToggleActive={onToggleActive}
                                    onDeactivateCatalog={onDeactivateCatalog}
                                    showTrash={showTrash}
                                    isSelected={selectedProducts.includes(product.id!)}
                                    onToggleSelection={() => onToggleSelection(product.id!)}
                                    categoryTree={categoryTree}
                                    onRefresh={onRefresh}
                                    onDuplicate={onDuplicate}
                                />
                            ))
                    )}
                </div>
            )}
        </div>
    );
};


export default ProductTable;
