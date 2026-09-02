import React, { useState, useEffect, useRef } from 'react';
import Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { processProductData } from '../LabelUtils';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';

interface ProductSearchInputProps {
    products: Product[];
    selectedProduct?: Product | null;
    onSelectProduct: (product: Product | null) => void;
    placeholder?: string;
    className?: string;
}

export const ProductSearchInput: React.FC<ProductSearchInputProps> = ({
    products,
    selectedProduct = null,
    onSelectProduct,
    placeholder = "Digite para buscar produto...",
    className = ""
}) => {
    const normalizeSearchText = (value: unknown) => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');

    // A sintaxe do filtro `or` do PostgREST usa vírgulas e parênteses como
    // separadores. Removê-los do termo evita que uma busca comum quebre a consulta.
    const getSafeSearchTerm = (value: string) => value.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');

    const buildProductSearchFilter = (term: string) =>
        `title.ilike.%${term}%,name.ilike.%${term}%,description.ilike.%${term}%,code.ilike.%${term}%,sku.ilike.%${term}%`;

    const buildVariationSearchFilter = (term: string) =>
        `name.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`;

    // Retorna o Título/Nome do produto priorizando title, name e description
    const getProductTitle = (p?: Product | null) => {
        if (!p) return '';
        return p.title || p.name || p.description || '';
    };

    const [isOpen, setIsOpen] = useState(false);
    const [filterText, setFilterText] = useState(getProductTitle(selectedProduct));
    const [dbSearchResults, setDbSearchResults] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dropdownMaxHeight, setDropdownMaxHeight] = useState(288);
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

    // O painel de resultados ocupa todo o espaço livre abaixo da busca. Assim,
    // listas grandes rolam dentro dele sem ficar escondidas pela tela.
    useEffect(() => {
        if (!isOpen) return;

        const updateDropdownHeight = () => {
            const bottom = containerRef.current?.getBoundingClientRect().bottom;
            if (bottom === undefined) return;
            setDropdownMaxHeight(Math.max(0, window.innerHeight - bottom - 16));
        };

        updateDropdownHeight();
        window.addEventListener('resize', updateDropdownHeight);
        window.addEventListener('scroll', updateDropdownHeight, true);
        return () => {
            window.removeEventListener('resize', updateDropdownHeight);
            window.removeEventListener('scroll', updateDropdownHeight, true);
        };
    }, [isOpen]);

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
                const term = getSafeSearchTerm(filterText);
                if (!term) {
                    setDbSearchResults([]);
                    return;
                }

                // A busca anterior incluía `variations::text` na tabela products.
                // Em instalações onde as variações ficam na tabela própria, esse
                // filtro invalida toda a pesquisa. Agora cada fonte é consultada
                // com os seus campos reais, inclusive o SKU da variação.
                const productsQuery = supabase
                    .from('products')
                    .select('*')
                    .is('deleted_at', null)
                    .or(buildProductSearchFilter(term))
                    .limit(50);

                const variationsQuery = supabase
                    .from('product_variations')
                    .select('*, products(*)')
                    .or(buildVariationSearchFilter(term))
                    .limit(50);

                const [productsResponse, variationsResponse] = await Promise.all([productsQuery, variationsQuery]);

                if (productsResponse.error) {
                    console.error('Erro no Supabase ao buscar produtos:', productsResponse.error);
                }
                if (variationsResponse.error) {
                    console.error('Erro no Supabase ao buscar variações:', variationsResponse.error);
                }

                const productResults = processProductData(productsResponse.data || []);
                const variationResults = (variationsResponse.data || []).flatMap((variation: any) => {
                    const parent = variation.products;
                    if (!parent) return [];
                    const variationTitle = variation.name || variation.description || variation.sku || '';
                    const title = getSelectedProductDisplayName(parent, variation) || variationTitle;

                    return [{
                        ...parent,
                        id: `${parent.id}_${variation.sku || variation.id}`,
                        sku: variation.sku || parent.sku || parent.code,
                        title,
                        description: title,
                        variationName: variationTitle,
                        unitPrice: variation.price ?? variation.unit_price ?? parent.unit_price ?? parent.unitPrice ?? 0,
                        promoPrice: variation.promo_price ?? variation.promoPrice ?? parent.promo_price ?? parent.promoPrice,
                        stock: variation.stock ?? parent.stock,
                        images: variation.images || variation.image_url ? (variation.images || [variation.image_url]) : parent.images,
                        parentImages: parent.images || [],
                        isVariation: true,
                        parentId: parent.id,
                    } as Product];
                });

                const resultMap = new Map<string, Product>();
                [...productResults, ...variationResults].forEach(product => {
                    if (product.id) resultMap.set(String(product.id), product);
                });
                setDbSearchResults(Array.from(resultMap.values()));
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
        const term = normalizeSearchText(filterText.trim());
        
        // 1. Filtrar lista local por título, nome, código ou SKU
        const localFiltered = (products || []).filter(p => {
            if (!term) return true;
            const pTitle = normalizeSearchText(getProductTitle(p));
            const pCode = normalizeSearchText(p.code);
            const pSku = normalizeSearchText(p.sku);
            const pDesc = normalizeSearchText(p.description);
            const pCat = normalizeSearchText(p.category);
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
                <div
                    className="absolute top-[calc(100%+6px)] left-0 right-0 z-[1000] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar p-1.5 animate-slide-up"
                    style={{ maxHeight: dropdownMaxHeight }}
                >
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
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                {(() => {
                                                    // Tenta múltiplos campos de imagem - Supabase pode retornar images como array ou string JSON
                                                    let imgArr = p.images;
                                                    if (typeof imgArr === 'string') {
                                                        try { imgArr = JSON.parse(imgArr); } catch { imgArr = undefined; }
                                                    }
                                                    const imgSrc = (Array.isArray(imgArr) && imgArr[0])
                                                        || (p as any).image_url
                                                        || (p as any).photo
                                                        || (p as any).thumbnail;
                                                    return imgSrc ? (
                                                        <img src={imgSrc} alt="" className="w-full h-full object-cover rounded-xl" />
                                                    ) : (
                                                        <i className="bi bi-box-seam-fill text-xs" />
                                                    );
                                                })()}
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
                </div>
            )}
        </div>
    );
};

export default ProductSearchInput;
