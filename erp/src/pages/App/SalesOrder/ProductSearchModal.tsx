import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Product, { Variation } from "../../types/product.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { formatCurrency } from "../../utils/formatters";
import ProductFormModal from "../Products/ProductFormModal";

interface Props {
    onSelect: (product: Product, variation?: Variation) => void;
    onClose: () => void;
    priceType?: 'unit' | 'cost';
}

const ProductSearchModal = ({ onSelect, onClose, priceType = 'unit' }: Props) => {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProductFormOpen, setIsProductFormOpen] = useState(false);

    useEffect(() => {
        const unsub = subscribeToProducts((data) => {
            setProducts(data.filter(p => p.active && !p.deleted && !p.isDraft));
            setLoading(false);
        });

        return () => { if (unsub) unsub(); };
    }, []);


    const flatSelectableItems = useMemo(() => {
        const items: { p: Product; v?: Variation; key: string }[] = [];
        
        products.forEach((p, pIdx) => {
            if (p.hasVariations && p.variations && p.variations.length > 0) {
                p.variations.forEach((v, vIdx) => {
                    if (v.active !== false) {
                        items.push({ 
                            p, 
                            v, 
                            key: `v-${v.id || vIdx}-${p.id || pIdx}` 
                        });
                    }
                });
            } else {
                items.push({ 
                    p, 
                    key: `p-${p.id || pIdx}` 
                });
            }
        });
        
        return items;
    }, [products]);

    const filtered = useMemo(() => {
        if (!search.trim()) return flatSelectableItems;
        const s = search.toLowerCase();
        
        return flatSelectableItems.filter(item => {
            const p = item.p;
            const v = item.v;
            const searchableText = [
                p.description,
                p.code,
                p.category,
                v?.name,
                v?.sku
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchableText.includes(s);
        });
    }, [flatSelectableItems, search]);

    return (
        <div
            className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800"
                style={{ height: '90vh', maxHeight: '90vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-blue-50 dark:bg-blue-900/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                            <i className="bi bi-box-seam-fill text-white text-xl" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">
                                Selecionar Item
                            </h2>
                            <p className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-widest mt-0.5">
                                Pesquise no catálogo
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            type="button"
                            onClick={() => setIsProductFormOpen(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md active:scale-95 font-black text-[9px] sm:text-[10px] uppercase tracking-widest"
                        >
                            <i className="bi bi-plus-lg" />
                            <span className="hidden xs:inline">Novo</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                        >
                            <i className="bi bi-x-lg text-lg" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Descrição, código ou categoria..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:font-normal placeholder:text-slate-400"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className="bi bi-x-circle-fill" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-900/30">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                            <i className="bi bi-hourglass-split animate-spin text-2xl" />
                            <span className="text-sm font-bold">Carregando itens...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3 px-6 text-center">
                            <i className="bi bi-box-seam text-4xl opacity-30" />
                            <p className="text-sm font-bold">Nenhum item encontrado</p>
                            <p className="text-xs text-slate-400">Tente buscar por outro termo ou cadastre um novo item</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-sm z-10">
                                    <tr className="border-b border-slate-100 dark:border-slate-700">
                                        <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                        <th className="hidden sm:table-cell px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Código</th>
                                        <th className="hidden md:table-cell px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Categoria</th>
                                        <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">{priceType === 'cost' ? 'Custo' : 'Preço'}</th>
                                        <th className="hidden xs:table-cell px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Estoque</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                {filtered.slice(0, 50).map((item) => {
                                    const { p, v, key } = item;
                                    const displayName = v ? v.name.replace(/\s*\/\s*/g, ' ') : p.description;
                                    const displayCode = v?.sku || p.code || "---";
                                    const displayPrice = (priceType === 'cost' ? (v?.costPrice || p.costPrice) : (v?.unitPrice || p.unitPrice)) || 0;
                                    const displayStock = v ? (v.stock || 0) : (p.stock || 0);
                                    const minStock = v ? (v.minStock || 0) : (p.minStock || 0);

                                    return (
                                        <tr
                                            key={key}
                                            onClick={() => { onSelect(p, v); onClose(); }}
                                            className="hover:bg-blue-50/60 dark:hover:bg-blue-900/10 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                                                        {displayName}
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5 items-center mt-1">
                                                        {v && (
                                                            <span className="text-[8px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/40">
                                                                Variação
                                                            </span>
                                                        )}
                                                        {p.isCombo && (
                                                            <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-purple-200 dark:border-purple-900/40">
                                                                <i className="bi bi-layers-fill"></i> Combo
                                                            </span>
                                                        )}
                                                        <span className={`text-[8px] w-fit px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ${p.itemType === 'service' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/10'}`}>
                                                            {p.itemType === 'service' ? 'Serviço' : 'Prod'}
                                                        </span>
                                                        {p.condition && (
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest border ${p.condition === 'novo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:text-emerald-400' :
                                                                p.condition === 'usado' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/10 dark:text-purple-400' :
                                                                    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/10 dark:text-amber-400'
                                                                }`}>
                                                                {p.condition}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="hidden sm:table-cell px-4 py-4">
                                                <span className="text-xs font-mono text-slate-400">
                                                    {displayCode}
                                                </span>
                                            </td>
                                            <td className="hidden md:table-cell px-4 py-4">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {p.category || "Sem Categoria"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="text-sm font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                                    {formatCurrency(displayPrice)}
                                                </span>
                                            </td>
                                            <td className="hidden xs:table-cell px-4 py-4 text-center">
                                                <span className={`text-xs font-bold ${
                                                    p.itemType === 'service' ? 'text-slate-500' :
                                                    (p.isCombo 
                                                        ? (p.comboItems?.length && Math.min(...p.comboItems.map((i: any) => Math.floor((i.stock || 0) / (i.quantity || 1)))) <= 0)
                                                        : displayStock <= 0)
                                                    ? 'text-amber-500' 
                                                    : (displayStock <= minStock ? 'text-red-500' : 'text-slate-500')
                                                }`}
                                                >
                                                    {p.itemType === 'service' ? '∞' : (
                                                        p.isCombo
                                                            ? (p.comboItems?.length
                                                                ? Math.min(...p.comboItems.map((i: any) => Math.floor((i.stock || 0) / (i.quantity || 1))))
                                                                : 0)
                                                            : displayStock
                                                    )}
                                                    {p.itemType !== 'service' && displayStock <= 0 && <i className="bi bi-exclamation-triangle-fill ml-1 animate-pulse" />}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button
                                                    type="button"
                                                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 bg-blue-600 text-white rounded-full sm:rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-sm"
                                                >
                                                    <span className="hidden sm:inline">Selecionar</span>
                                                    <i className="bi bi-plus text-lg sm:text-base" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
                    <p className="hidden xs:block text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-60">
                        {filtered.length} itens encontrados
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            {isProductFormOpen && (
                <ProductFormModal
                    isOpen={isProductFormOpen}
                    onClose={() => setIsProductFormOpen(false)}
                    onSuccess={(newProduct: Product) => {
                        onSelect(newProduct);
                        onClose();
                    }}
                />
            )}
        </div>
    );
};

export default ProductSearchModal;
