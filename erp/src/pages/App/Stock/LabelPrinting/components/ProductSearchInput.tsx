import React, { useState, useEffect, useRef } from 'react';
import Product from '@/pages/types/product.type';

interface ProductSearchInputProps {
    products: Product[];
    selectedProduct?: Product | null;
    onSelectProduct: (product: Product | null) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    placeholder?: string;
    className?: string;
}

export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
    products,
    selectedProduct = null,
    onSelectProduct,
    onLoadMore,
    hasMore = false,
    placeholder = "Digite para buscar produto...",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState(selectedProduct?.description || '');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!selectedProduct) {
            setFilterText('');
        } else {
            setFilterText(selectedProduct.description || '');
        }
    }, [selectedProduct]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = products.filter(p => {
        if (!filterText.trim()) return true;
        const term = filterText.toLowerCase();
        return (
            (p.description || '').toLowerCase().includes(term) ||
            (p.code || '').toLowerCase().includes(term) ||
            (p.sku || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term)
        );
    });

    const formatCurrency = (val: number | string | undefined) => {
        if (!val) return 'R$ 0,00';
        const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
        if (isNaN(num)) return 'R$ 0,00';
        return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    return (
        <div ref={containerRef} className={`relative flex-1 ${className}`}>
            <div className="flex items-center gap-3 w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all cursor-text min-w-[240px]">
                <span className="w-7 h-7 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <i className="bi bi-search text-xs" />
                </span>

                <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                        Buscar Produto
                    </span>
                    <input
                        type="text"
                        value={filterText}
                        onChange={(e) => {
                            setFilterText(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        placeholder={placeholder}
                        className="bg-transparent border-0 p-0 focus:ring-0 text-xs font-black uppercase text-slate-800 dark:text-slate-100 placeholder:text-slate-400 placeholder:font-normal outline-none w-full truncate"
                    />
                </div>

                {filterText ? (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setFilterText('');
                            onSelectProduct(null);
                            setIsOpen(true);
                        }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 transition-colors"
                        title="Limpar busca"
                    >
                        <i className="bi bi-x-circle-fill text-sm" />
                    </button>
                ) : (
                    <i className="bi bi-chevron-down text-xs text-slate-400" />
                )}
            </div>

            {/* Dropdown Popover Modal filtrado */}
            {isOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto custom-scrollbar p-1.5 animate-slide-up">
                    {filtered.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {filtered.slice(0, 50).map((p) => {
                                const isSelected = selectedProduct?.id === p.id;
                                const priceText = formatCurrency(p.unitPrice || (p as any).price);
                                
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setFilterText(p.description);
                                            onSelectProduct(p);
                                            setIsOpen(false);
                                        }}
                                        className={`flex items-center justify-between p-3 rounded-xl transition-all text-left w-full cursor-pointer ${
                                            isSelected 
                                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold' 
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {p.images && p.images[0] ? (
                                                    <img src={p.images[0]} alt="" className="w-full h-full object-cover rounded-xl" />
                                                ) : (
                                                    <i className="bi bi-box-seam-fill text-xs" />
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-black uppercase truncate">{p.description}</span>
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                                    {(p.sku || p.code) && (
                                                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                                                            SKU: {p.sku || p.code}
                                                        </span>
                                                    )}
                                                    {p.category && <span>&bull; {p.category}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0 ml-2">
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                {priceText}
                                            </span>
                                            {isSelected && <i className="bi bi-check-lg text-blue-600 dark:text-blue-400 text-base" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-4 text-center">
                            <span className="text-xs font-medium text-slate-400 block mb-1">Nenhum produto encontrado com "{filterText}"</span>
                        </div>
                    )}

                    {hasMore && onLoadMore && (
                        <button
                            type="button"
                            onClick={() => onLoadMore()}
                            className="flex items-center justify-center gap-2 w-full p-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-all cursor-pointer"
                        >
                            <i className="bi bi-arrow-down-circle-fill text-sm" />
                            <span>Carregar Mais Produtos</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductSearchInput;
