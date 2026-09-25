import React, { useState } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import type { InventoryFilter } from "../../hooks/useInventoryOperation";

import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import ProductSearchModal from '@/pages/App/SalesOrder/modals/ProductSearchModal';

interface InventoryManualModeProps {
    readonly filteredItems: readonly AuditItem[];
    readonly filter: InventoryFilter;
    readonly setFilter: (f: InventoryFilter) => void;
    readonly search: string;
    readonly setSearch: (s: string) => void;
    readonly onUpdateCount: (id: string, count: number | null) => void;
    readonly isCustom?: boolean;
    readonly onUpdateItemProduct?: (itemId: string, product: Product, variation?: Variation) => void;
}

export const InventoryManualMode: React.FC<InventoryManualModeProps> = ({
    filteredItems,
    filter,
    setFilter,
    search,
    setSearch,
    onUpdateCount,
    isCustom,
    onUpdateItemProduct,
}) => {
    const [itemSearchOpen, setItemSearchOpen] = useState<string | null>(null);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex w-full sm:w-auto p-1 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-x-auto hide-scrollbar">
                    {(['all', 'uncounted', 'counted', 'divergent'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-colors ${filter === f ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                        >
                            {f === 'all' ? 'Todos' : f === 'uncounted' ? 'Não contados' : f === 'counted' ? 'Contados' : 'Divergentes'}
                        </button>
                    ))}
                </div>
                {!isCustom && (
                    <div className="relative w-full sm:w-64 shrink-0">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                        <input 
                            type="text"
                            placeholder="Buscar item..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {filteredItems.map(item => {
                    const isCounted = item.physicalCount !== null;
                    const diff = isCounted ? item.physicalCount! - item.systemStock : 0;
                    
                    return (
                        <div key={item.id} className={`bg-white dark:bg-slate-800 border ${isCounted ? 'border-emerald-500/30 dark:border-emerald-500/20' : 'border-slate-200 dark:border-slate-700'} rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.productId === '' ? (
                                        <div className="w-full relative z-50">
                                            <button
                                                onClick={() => setItemSearchOpen(item.id)}
                                                className="w-full text-left bg-transparent border-0 border-b-2 border-slate-300 dark:border-slate-600 rounded-none px-1 py-1.5 focus:ring-0 focus:border-emerald-500 text-base font-bold text-slate-800 dark:text-slate-100 placeholder:font-normal text-slate-400"
                                            >
                                                Pesquisar produto...
                                            </button>
                                            {itemSearchOpen === item.id && (
                                                <ProductSearchModal
                                                    onSelect={(p, v) => {
                                                        onUpdateItemProduct?.(item.id, p, v);
                                                        setItemSearchOpen(null);
                                                    }}
                                                    onClose={() => setItemSearchOpen(null)}
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 w-full min-w-0">
                                            <h4 className={`font-bold truncate text-base flex-1 ${isCustom ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                                {item.name}
                                            </h4>
                                            {isCustom && <i className="bi bi-check-circle-fill text-emerald-500 text-lg shrink-0"></i>}
                                        </div>
                                    )}
                                    {isCounted && item.productId !== '' && <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></div>}
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sistema</span>
                                        <span className="font-bold text-slate-600 dark:text-slate-300">{item.systemStock} {item.unit}</span>
                                    </div>
                                    {isCounted && diff !== 0 && (
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Ajuste</span>
                                            <span className={`font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                {diff > 0 ? '+' : ''}{diff}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-xl sm:shrink-0 w-full sm:w-auto justify-between sm:justify-center">
                                <button
                                    onClick={() => onUpdateCount(item.id, Math.max(0, (item.physicalCount || 0) - 1))}
                                    disabled={item.physicalCount === 0}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-sm active:scale-95 transition-all"
                                >
                                    <i className="bi bi-dash"></i>
                                </button>
                                
                                <div className="flex flex-col items-center min-w-[50px]">
                                    <input
                                        type="number"
                                        value={item.physicalCount === null ? '' : item.physicalCount}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val === '') onUpdateCount(item.id, null);
                                            else onUpdateCount(item.id, Math.max(0, parseInt(val, 10) || 0));
                                        }}
                                        placeholder="-"
                                        className="w-full text-center bg-transparent text-xl font-black text-slate-800 dark:text-slate-100 outline-none p-0 focus:ring-0 border-0"
                                    />
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Contado</span>
                                </div>

                                <button
                                    onClick={() => onUpdateCount(item.id, (item.physicalCount || 0) + 1)}
                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-lg shadow-sm active:scale-95 transition-all"
                                >
                                    <i className="bi bi-plus"></i>
                                </button>
                            </div>
                        </div>
                    );
                })}
                
                {filteredItems.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        Nenhum item encontrado com estes filtros.
                    </div>
                )}
            </div>
        </div>
    );
};
