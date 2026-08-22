import React, { useState, useEffect, useRef } from 'react';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { processProductData } from '../LabelUtils';

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
    // Retorna o Título/Nome do produto priorizando title, name e description
    const getProductTitle = (p?: Product | null) => {
        if (!p) return '';
        return p.title || p.name || p.description || '';
    };

    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState(getProductTitle(selectedProduct));
    const [dbSearchResults, setDbSearchResults] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!selectedProduct) {
            setFilterText('');
        } else {
            setFilterText(getProductTitle(selectedProduct));
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

    // BUSCA AO VIVO NO SUPABASE POR TÍTULO, NOME, CÓDIGO, SKU OU DESCRIÇÃO
    useEffect(() => {
        if (!filterText.trim() || filterText.trim().length < 2) {
            setDbSearchResults([]);
            setIsLoading(false);
            return;
        }

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const term = filterText.trim();
                const words = term.split(/\s+/).filter(w => w.length > 0);

                let query = supabase
                    .from('products')
                    .select('*')
                    .is('deleted_at', null);

                if (words.length === 1) {
                    const w = words[0];
                    query = query.or(`title.ilike.%${w}%,name.ilike.%${w}%,description.ilike.%${w}%,code.ilike.%${w}%,sku.ilike.%${w}%,variations::text.ilike.%${w}%`);
                } else {
                    words.forEach(w => {
                        query = query.or(`title.ilike.%${w}%,name.ilike.%${w}%,description.ilike.%${w}%`);
                    });
                }

                const { data, error } = await query.limit(50);

                if (data && !error) {
                    const processed = processProductData(data);
                    setDbSearchResults(processed);
                } else if (error) {
                    console.error("Erro no Supabase ao buscar produto:", error);
                }
            } catch (err) {
                console.error("Erro na busca de produtos:", err);
            } finally {
                setIsLoading(false);
            }
        }, 200);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [filterText]);

    // COMBINA OS PRODUTOS DA PROP LOCAL COM OS RESULTADOS AO VIVO DO BANCO DE DADOS
    const combinedProducts = React.useMemo(() => {
        const term = filterText.trim().toLowerCase();
        
        // 1. Filtrar lista local por título, nome, código ou SKU
        const localFiltered = (products || []).filter(p => {
            if (!term) return true;
            const pTitle = getProductTitle(p).toLowerCase();
            const pCode = (p.code || '').toLowerCase();
            const pSku = (p.sku || '').toLowerCase();
            const pDesc = (p.description || '').toLowerCase();
            const pCat = (p.category || '').toLowerCase();
            return pTitle.includes(term) || pDesc.includes(term) || pCode.includes(term) || pSku.includes(term) || pCat.includes(term);
        });

        // 2. Mesclar com resultados remotos do Supabase evitando duplicatas por ID
        const map = new Map<string, Product>();
        localFiltered.forEach(p => { if (p.id) map.set(String(p.id), p); });
        dbSearchResults.forEach(p => { if (p.id) map.set(String(p.id), p); });

        return Array.from(map.values());
    }, [products, dbSearchResults, filterText]);

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
                    {isLoading ? (
                        <i className="bi bi-arrow-repeat text-xs animate-spin text-blue-500" />
                    ) : (
                        <i className="bi bi-search text-xs" />
                    )}
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
                    {isLoading && combinedProducts.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs font-bold flex items-center justify-center gap-2">
                            <i className="bi bi-arrow-repeat animate-spin text-sm text-blue-500" />
                            <span>Buscando produtos no banco de dados...</span>
                        </div>
                    ) : combinedProducts.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                            {combinedProducts.slice(0, 50).map((p) => {
                                const isSelected = selectedProduct?.id === p.id;
                                const title = getProductTitle(p);
                                const priceText = formatCurrency(p.unitPrice || (p as any).unit_price || (p as any).price);
                                
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setFilterText(title);
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
                                                <span className="text-xs font-black uppercase truncate">{title}</span>
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
