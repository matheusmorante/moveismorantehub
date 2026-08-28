import React, { useState, useEffect, useRef } from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { fetchProductsPage } from '../pages/utils/productService';
import DropdownPortal from './shared/DropdownPortal';
import { normalizeProductSearch, renderHighlightedProductText, SuggestionItem } from './productAutocompleteUtils';

interface ProductAutocompleteProps {
    onSelect: (product: Product, variation?: Variation) => void;
    onSelectDescription?: (description: string) => void;
    onChange?: (value: string) => void;
    onSearch?: () => void;
    onCreateNew?: () => void;
    isSelected?: boolean;
    isTemporary?: boolean;
    value?: string;
    placeholder?: string;
    className?: string;
}


const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    onSelect,
    onSelectDescription,
    onChange,
    onSearch,
    onCreateNew,
    isSelected = false,
    isTemporary = false,
    value = "",
    placeholder = "Digite o nome ou código do produto...",
    className = ""
}) => {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSuggestions = async () => {
            const trimmed = query.trim();
            if (trimmed.length < 2) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            try {
                const words = trimmed.split(/\s+/).filter(w => w.length > 0);
                const { data: productsData } = await fetchProductsPage(1, 30, {
                    search: trimmed,
                    activeOnly: true,
                });
                const items: SuggestionItem[] = [];
                const searchNormWords = words.map(normalizeProductSearch);

                (productsData || []).forEach((p: Product) => {
                    const variations = p.variations || [];

                    if (p.hasVariations && variations.length > 0) {
                        variations.forEach(v => {
                            if (v.active !== false) {
                                const fullName = v.name && normalizeProductSearch(v.name).includes(normalizeProductSearch(p.description))
                                    ? v.name 
                                    : `${p.description} - ${v.name}`;
                                const normFullName = normalizeProductSearch(fullName);
                                const normSku = normalizeProductSearch(v.sku || '');

                                const matchesAll = searchNormWords.every(nw => 
                                    normFullName.includes(nw) || normSku.includes(nw)
                                );

                                if (matchesAll || words.length === 1) {
                                    items.push({ product: p, variation: v });
                                }
                            }
                        });
                    } else {
                        items.push({ product: p });
                    }
                });

                setSuggestions(items.slice(0, 10));
            } catch (error) {
                console.error('Erro ao buscar sugestões:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 250);
        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="flex gap-1.5">
                <div className="relative flex-1">
                    <input
                        type="text"
                        autoComplete="off"
                        value={query || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQuery(val);
                            setShowSuggestions(val.trim().length >= 2);
                            if (onChange) onChange(val);
                        }}
                        onFocus={() => setShowSuggestions(query.trim().length >= 2)}
                        placeholder={placeholder}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-900 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all ${isTemporary ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/20 focus:border-amber-500 focus:ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'} ${isSelected ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10' : ''} ${className}`}
                    />
                    {isLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <i className="bi bi-arrow-repeat animate-spin text-slate-400"></i>
                        </div>
                    )}
                </div>
                
                {onSearch && (
                    <button
                        type="button"
                        onClick={onSearch}
                        className="p-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                        title="Busca Avançada (Lupa)"
                    >
                        <i className="bi bi-search"></i>
                    </button>
                )}

                {onCreateNew && (
                    <button
                        type="button"
                        onClick={onCreateNew}
                        className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                        title="Criar Novo Produto"
                    >
                        <i className="bi bi-plus-lg"></i>
                    </button>
                )}
            </div>

            <DropdownPortal anchorRef={wrapperRef} isOpen={showSuggestions && query.trim().length >= 2}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100 dark:divide-slate-800/50">
                    {isLoading ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-5 text-xs font-bold text-slate-400">
                            <i className="bi bi-arrow-repeat animate-spin" />
                            Buscando produtos...
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="px-4 py-5 text-center text-xs font-bold text-slate-400">
                            Nenhum produto encontrado para esta busca.
                        </div>
                    ) : suggestions.map((item, index) => {
                        const { product: p, variation: v } = item;
                        const fullName = v 
                            ? (v.name && normalizeProductSearch(v.name).includes(normalizeProductSearch(p.description)) ? v.name : `${p.description} - ${v.name}`)
                            : p.description;

                        const displayCode = v?.sku || p.code || '';
                        const displayPrice = v 
                            ? (v.promoPrice || v.unitPrice || p.promoPrice || p.unitPrice || 0) 
                            : (p.promoPrice || p.unitPrice || 0);
                        const displayStock = v ? (v.stock ?? 0) : (p.stock ?? 0);

                        return (
                            <button
                                key={`${p.id}-${v?.id || 'base'}-${index}`}
                                type="button"
                                onClick={() => {
                                    onSelect(p, v);
                                    if (onSelectDescription) onSelectDescription(fullName);
                                    setQuery(fullName);
                                    setShowSuggestions(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-blue-50/50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 group"
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                        {renderHighlightedProductText(fullName, query)}
                                    </span>
                                    {displayCode && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                            Cód: {displayCode}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-sans">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${displayStock > 0 ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-red-50 dark:bg-red-900/30 text-red-500'}`}>
                                        {displayStock > 0 ? `${displayStock} un` : 'Sem estoque'}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </DropdownPortal>
        </div>
    );
};

export default ProductAutocomplete;
