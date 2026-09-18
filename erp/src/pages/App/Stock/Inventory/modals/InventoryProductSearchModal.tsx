import React from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import { useProductSearch } from '../../../SalesOrder/hooks/useProductSearch';
import { getVariationDisplayName } from '@/components/productAutocompleteUtils';

interface InventoryProductSearchModalProps {
    readonly onSelect: (product: Product, variation?: Variation) => void;
    readonly onClose: () => void;
}

export const InventoryProductSearchModal: React.FC<InventoryProductSearchModalProps> = ({ onSelect, onClose }) => {
    const { search, setSearch, loading, filtered } = useProductSearch('cost');

    const handleSelect = (product: Product, variation?: Variation) => {
        onSelect(product, variation);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
                style={{ height: '80vh', maxHeight: '80vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-violet-50 dark:bg-violet-900/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-600 p-2.5 rounded-xl shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
                            <i className="bi bi-search text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Buscar Produto
                            </h2>
                            <p className="text-[10px] uppercase font-black text-violet-600 dark:text-violet-400 tracking-widest mt-0.5">
                                Selecione para adicionar à contagem
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Nome, SKU, código..."
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-violet-500/40"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {loading && (
                        <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                            <i className="bi bi-arrow-repeat animate-spin" />
                            <span className="text-sm font-medium">Carregando...</span>
                        </div>
                    )}

                    {!loading && filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                            <i className="bi bi-box text-3xl" />
                            <p className="text-sm font-medium">
                                {search.length > 0 ? 'Nenhum produto encontrado' : 'Digite para buscar produtos'}
                            </p>
                        </div>
                    )}

                    {!loading && filtered.map(({ p, v, key }) => {
                        const displayName = getVariationDisplayName(p, v) || p.description || p.name || 'Produto';
                        const systemStock = v ? Number(v.stock ?? 0) : Number(p.stock ?? 0);

                        return (
                            <button
                                key={key}
                                type="button"
                                className="w-full flex items-center gap-4 px-6 py-4 hover:bg-violet-50 dark:hover:bg-violet-900/10 text-left transition-colors"
                                onClick={() => handleSelect(p, v)}
                            >
                                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                    <i className="bi bi-box text-violet-600 dark:text-violet-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{displayName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Estoque: {systemStock} {p.unit || 'UN'}
                                    </p>
                                </div>
                                <i className="bi bi-plus-circle text-violet-600 dark:text-violet-400 text-lg shrink-0" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default InventoryProductSearchModal;
