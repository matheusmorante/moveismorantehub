import React, { useState, useEffect, useRef } from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { supabase } from '../pages/utils/supabaseConfig';
import { searchHistoricalItems } from '../pages/utils/productService';
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
    type: 'product' | 'historical';
    product?: Product;
    variation?: Variation;
    description?: string;
};

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
            if (query.trim().length < 2) {
                setSuggestions([]);
                return;
            }

            setIsLoading(true);
            try {
                // 1. Buscar no Catálogo de Produtos
                const words = query.trim().split(/\s+/).filter(w => w.length > 0);
                
                let dbQuery = supabase
                    .from('products')
                    .select('*')
                    .eq('deleted', false);

                // Se houver apenas uma palavra, busca por código OU descrição
                if (words.length === 1) {
                    dbQuery = dbQuery.or(`description.ilike.%${words[0]}%,code.ilike.%${words[0]}%`);
                } else {
                    // Se houver múltiplas palavras, todas devem estar na descrição (AND)
                    words.forEach(word => {
                        dbQuery = dbQuery.ilike('description', `%${word}%`);
                    });
                }

                const { data: productsData, error: productsError } = await dbQuery.limit(10);

                if (productsError) throw productsError;
                
                const items: SuggestionItem[] = [];
                (productsData || []).forEach((raw: any) => {
                    const p: Product = {
                        id: String(raw.id),
                        code: raw.code,
                        description: raw.description,
                        unitPrice: Number(raw.unit_price),
                        costPrice: Number(raw.cost_price),
                        stock: Number(raw.stock),
                        minStock: Number(raw.min_stock),
                        unit: raw.unit || 'un',
                        active: raw.active,
                        hasVariations: raw.has_variations,
                        variations: raw.variations,
                        itemType: raw.item_type || 'product'
                    };

                    if (p.hasVariations && p.variations && p.variations.length > 0) {
                        p.variations.forEach(v => {
                            if (v.active !== false) {
                                items.push({ type: 'product', product: p, variation: v });
                            }
                        });
                    } else {
                        items.push({ type: 'product', product: p });
                    }
                });

                // 2. Buscar no Histórico (Pedidos/Compras)
                if (items.length < 10) {
                    const historicalDescriptions = await searchHistoricalItems(query);
                    historicalDescriptions.forEach(desc => {
                        // Evitar duplicados se já existir no catálogo ou se for idêntico ao que o usuário já digitou
                        const isQueryIdentical = desc.toLowerCase() === query.toLowerCase();
                        const alreadyExists = items.some(it => 
                            it.product?.description.toLowerCase() === desc.toLowerCase() ||
                            (it.variation && `${it.product?.description} (${it.variation.name})`.toLowerCase() === desc.toLowerCase())
                        );
                        
                        if (!alreadyExists && !isQueryIdentical) {
                            items.push({ type: 'historical', description: desc });
                        }
                    });
                }

                setSuggestions(items);
            } catch (error) {
                console.error('Erro ao buscar sugestões:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 300);
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
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {suggestions.map((item, index) => {
                        const { type, product: p, variation: v, description: histDesc } = item;
                        
                        if (type === 'historical') {
                            return (
                                <button
                                    key={`hist-${index}`}
                                    type="button"
                                    onClick={() => {
                                        if (onSelectDescription) onSelectDescription(histDesc!);
                                        else onChange?.(histDesc!);
                                        setQuery(histDesc!);
                                        setShowSuggestions(false);
                                    }}
                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col gap-0.5"
                                >
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {renderHighlightedText(histDesc!, query)}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 rounded">HISTÓRICO</span>
                                        <span className="text-[10px] text-slate-400">Item de pedido anterior</span>
                                    </div>
                                </button>
                            );
                        }

                        // Catalogo Item
                        const displayName = v ? v.name : p!.description;
                        const displayCode = v?.sku || p!.code || 'S/REF';
                        const displayPrice = v ? v.unitPrice : p!.unitPrice;
                        const displayStock = v ? v.stock : p!.stock;

                        return (
                            <button
                                key={`${p!.id}-${v?.id || 'base'}-${index}`}
                                type="button"
                                onClick={() => {
                                    onSelect(p!, v);
                                    setQuery(displayName);
                                    setShowSuggestions(false);
                                }}
                                className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex flex-col gap-0.5"
                            >
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    {renderHighlightedText(displayName, query)}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{displayCode}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(displayPrice)}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${displayStock && displayStock > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                        Estoque: {displayStock || 0}
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
