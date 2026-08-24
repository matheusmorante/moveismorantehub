import React, { useState, useEffect, useRef } from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { supabase } from '../pages/utils/supabaseConfig';
import DropdownPortal from './shared/DropdownPortal';

interface ProductAutocompleteProps {
    onSelect: (product: Product, variation?: Variation) => void;
    onSelectDescription?: (description: string) => void;
    onChange?: (value: string) => void;
    onSearch?: () => void;
    onCreateNew?: () => void;
    isSelected?: boolean;
    value?: string;
    placeholder?: string;
    className?: string;
}

type SuggestionItem = {
    product: Product;
    variation?: Variation;
};

const normalizeStr = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    
    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
        <span>
            {parts.map((part, i) => (
                pattern.test(part) ? 
                <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded-sm px-0.5">{part}</span> : 
                <span key={i}>{part}</span>
            ))}
        </span>
    );
};

const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
    onSelect,
    onSelectDescription,
    onChange,
    onSearch,
    onCreateNew,
    isSelected = false,
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
                
                let dbQuery = supabase
                    .from('products')
                    .select('*, product_variations(*), product_images(*)')
                    .is('deleted_at', null);

                if (words.length === 1) {
                    dbQuery = dbQuery.or(`description.ilike.%${words[0]}%,code.ilike.%${words[0]}%`);
                } else {
                    words.forEach(word => {
                        dbQuery = dbQuery.ilike('description', `%${word}%`);
                    });
                }

                const { data: productsData, error: productsError } = await dbQuery.limit(15);

                if (productsError) throw productsError;
                
                const items: SuggestionItem[] = [];
                const searchNormWords = words.map(w => normalizeStr(w));

                (productsData || []).forEach((raw: any) => {
                    const rawVars = raw.product_variations?.length ? raw.product_variations : raw.variations;
                    const parsedVars: Variation[] = (Array.isArray(rawVars) ? rawVars : []).map((v: any) => ({
                        id: String(v.id || v.sku || Math.random()),
                        sku: v.sku || '',
                        name: v.name || '',
                        title: v.title || '',
                        unitPrice: Number(v.unit_price ?? v.unitPrice ?? raw.unit_price ?? 0),
                        promoPrice: v.promo_price ?? v.promoPrice ? Number(v.promo_price ?? v.promoPrice) : undefined,
                        costPrice: Number(v.cost_price ?? v.costPrice ?? raw.cost_price ?? 0),
                        stock: Number(v.stock ?? 0),
                        active: v.active !== false,
                        condition: v.condition || raw.condition || 'novo',
                        attributes: v.attributes || []
                    }));

                    const p: Product = {
                        id: String(raw.id),
                        code: raw.code,
                        description: raw.description,
                        unitPrice: Number(raw.unit_price || 0),
                        promoPrice: raw.promo_price ? Number(raw.promo_price) : undefined,
                        costPrice: Number(raw.cost_price || 0),
                        stock: Number(raw.stock || 0),
                        minStock: Number(raw.min_stock || 0),
                        unit: raw.unit || 'un',
                        active: raw.active,
                        hasVariations: raw.has_variations || parsedVars.length > 0,
                        variations: parsedVars,
                        itemType: raw.item_type || 'product'
                    };

                    if (p.hasVariations && p.variations && p.variations.length > 0) {
                        p.variations.forEach(v => {
                            if (v.active !== false) {
                                const fullName = v.name && normalizeStr(v.name).includes(normalizeStr(p.description)) 
                                    ? v.name 
                                    : `${p.description} - ${v.name}`;
                                const normFullName = normalizeStr(fullName);
                                const normSku = normalizeStr(v.sku || '');

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
                            setShowSuggestions(true);
                            if (onChange) onChange(val);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={placeholder}
                        className={`w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium transition-all ${isSelected ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10' : ''}`}
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

            <DropdownPortal anchorRef={wrapperRef} isOpen={showSuggestions && suggestions.length > 0}>
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 divide-y divide-slate-100 dark:divide-slate-800/50">
                    {suggestions.map((item, index) => {
                        const { product: p, variation: v } = item;
                        
                        const fullName = v 
                            ? (v.name && normalizeStr(v.name).includes(normalizeStr(p.description)) ? v.name : `${p.description} - ${v.name}`) 
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
                                        {renderHighlightedText(fullName, query)}
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
