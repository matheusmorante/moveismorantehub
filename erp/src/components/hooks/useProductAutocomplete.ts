import { useState, useEffect, useRef } from 'react';
import Product from '../pages/types/product.type';
import { fetchAllProductSearchResults, getVariationDisplayName, normalizeProductSearch, SuggestionItem } from '../productAutocompleteUtils';

interface UseProductAutocompleteProps {
    value?: string;
    supplierId?: string;
    parentsOnly?: boolean;
    variationsOnly?: boolean;
    includeDeactivated?: boolean;
    localProducts?: Product[];
    onChange?: (value: string) => void;
}

export function useProductAutocomplete({
    value = '',
    supplierId,
    parentsOnly = false,
    variationsOnly = false,
    includeDeactivated = false,
    localProducts,
    onChange,
}: UseProductAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const handleProductUpdated = () => setRefreshKey(k => k + 1);
        if (typeof window !== 'undefined') {
            window.addEventListener('product-updated', handleProductUpdated);
            return () => window.removeEventListener('product-updated', handleProductUpdated);
        }
    }, []);

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
                const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
                const productsData = localProducts?.length
                    ? localProducts
                    : await fetchAllProductSearchResults(trimmed, supplierId || undefined, includeDeactivated);
                const items: SuggestionItem[] = [];
                const searchNormWords = words.map(normalizeProductSearch);

                (productsData || []).forEach((p: Product) => {
                    const supplierIds = p.supplierIds || (p as any).supplier_ids || [];
                    const prodSupplierId = p.mainSupplierId || p.supplierId || (p as any).main_supplier_id || (p as any).supplier_id;
                    if (supplierId && !supplierIds.includes(supplierId) && prodSupplierId !== supplierId) {
                        return;
                    }

                    const variations = p.variations || [];

                    if (parentsOnly) {
                        const baseName = (p.name || p.title || '').trim();
                        const matchesAll = searchNormWords.every(
                            (word) => normalizeProductSearch(baseName).includes(word) || normalizeProductSearch(p.code || '').includes(word)
                        );
                        if (matchesAll) items.push({ product: p });
                    } else if (variations.length > 0) {
                        variations.forEach((v) => {
                            const baseName = (p.name || p.title || '').trim();
                            if ((includeDeactivated || v.active !== false) && !v.mergedToVariationId) {
                                const fullName = getVariationDisplayName(p, v);
                                const normFullName = normalizeProductSearch(fullName);
                                const normSku = normalizeProductSearch(v.sku || '');

                                const matchesAll = searchNormWords.every((nw) => normFullName.includes(nw) || normSku.includes(nw));

                                if (matchesAll) {
                                    items.push({ product: p, variation: v });
                                }
                            }
                        });
                    } else if (!variationsOnly) {
                        const baseName = (p.name || p.title || '').trim();
                        if (includeDeactivated || p.active !== false) {
                            const matchesAll = searchNormWords.every(
                                (word) => normalizeProductSearch(baseName).includes(word) || normalizeProductSearch(p.code || '').includes(word)
                            );
                            if (matchesAll) items.push({ product: p });
                        }
                    }
                });

                setSuggestions(items);
            } catch (error) {
                console.error('Erro ao buscar sugestões:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 250);
        return () => clearTimeout(timeoutId);
    }, [query, supplierId, variationsOnly, parentsOnly, includeDeactivated, localProducts, refreshKey]);

    const handleQueryChange = (val: string) => {
        setQuery(val);
        setShowSuggestions(val.trim().length >= 2);
        if (onChange) onChange(val);
    };

    return {
        query,
        setQuery,
        handleQueryChange,
        suggestions,
        isLoading,
        showSuggestions,
        setShowSuggestions,
        wrapperRef,
    };
}
