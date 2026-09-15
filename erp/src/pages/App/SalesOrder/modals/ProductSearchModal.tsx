import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Product, { Variation } from "../../types/product.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { formatCurrency } from "../../utils/formatters";
import ProductFormModal from "../Products/ProductFormModal";
import { normalizeSearchTerm } from "@/pages/utils/textUtils";

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
            if (p.variations && p.variations.length > 0) {
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
        const s = normalizeSearchTerm(search);
        
        return flatSelectableItems.filter(item => {
            const p = item.p;
            const v = item.v;
            const searchableText = normalizeSearchTerm([
                p.description,
                p.code,
                p.category,
                v?.name,
                v?.sku
            ].filter(Boolean).join(' '));
            
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

                {/* List Items */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                            <i className="bi bi-arrow-repeat text-2xl animate-spin mb-2" />
                            <p className="text-xs font-bold">Carregando itens...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center">
                            <i className="bi bi-inbox text-3xl mb-2" />
                            <p className="text-xs font-bold">Nenhum item encontrado</p>
                        </div>
                    ) : (
                        filtered.map(item => {
                            const p = item.p;
                            const v = item.v;
                            const price = v ? (priceType === 'cost' ? (v.costPrice || p.costPrice || 0) : (v.unitPrice || p.unitPrice || 0)) : (priceType === 'cost' ? (p.costPrice || 0) : (p.unitPrice || 0));
                            const title = v ? `${p.description} - ${v.name}` : p.description;

                            return (
                                <div
                                    key={item.key}
                                    onClick={() => {
                                        onSelect(p, v);
                                        onClose();
                                    }}
                                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 shadow-sm">
                                            {p.code || 'N/A'}
                                        </div>
                                        <div>
                                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {title}
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {p.category || 'Sem Categoria'} {v?.sku ? `• SKU: ${v.sku}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">
                                            {formatCurrency(price)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <ProductFormModal
                isOpen={isProductFormOpen}
                onClose={() => setIsProductFormOpen(false)}
                onSave={async () => {
                    setIsProductFormOpen(false);
                }}
            />
        </div>
    );
};

export default ProductSearchModal;
