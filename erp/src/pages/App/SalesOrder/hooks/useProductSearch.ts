import { useState, useEffect, useMemo } from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { getCompositions } from '@/pages/utils/compositionService';
import { normalizeSearchTerm } from "@/pages/utils/textUtils";
import type { Composition } from '@/pages/types/composition.type';

export const useProductSearch = (priceType: 'unit' | 'cost' = 'unit') => {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [compositions, setCompositions] = useState<Composition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const loadComps = async () => {
            try {
                const data = await getCompositions({ includeInactive: false });
                if (isMounted) setCompositions(data);
            } catch (err) {
                console.error("Erro ao buscar composições no hook", err);
            }
        };
        
        loadComps();

        const unsub = subscribeToProducts((data) => {
            if (isMounted) {
                setProducts(data.filter(p => p.active && !p.deleted && !p.isDraft));
                setLoading(false);
            }
        });

        return () => { 
            isMounted = false;
            if (unsub) unsub(); 
        };
    }, []);

    const flatSelectableItems = useMemo(() => {
        const items: { p: any; v?: any; key: string; isComposition?: boolean }[] = [];
        
        products.forEach((p, pIdx) => {
            if (p.variations && p.variations.length > 0) {
                p.variations.forEach((v, vIdx) => {
                    if (v.active !== false) {
                        items.push({ p, v, key: `v-${v.id || vIdx}-${p.id || pIdx}` });
                    }
                });
            } else {
                items.push({ p, key: `p-${p.id || pIdx}` });
            }
        });

        compositions.forEach((c) => {
            if (c.variations && c.variations.length > 0) {
                c.variations.forEach((cv) => {
                    if (cv.active !== false) {
                        items.push({
                            p: {
                                ...c,
                                isComposition: true,
                                description: c.name,
                                unitPrice: c.manual_price || c.calculatedPrice || 0,
                                code: c.sku || 'COMP',
                                category: 'Composição'
                            },
                            v: cv,
                            key: `comp-v-${cv.id}-${c.id}`,
                            isComposition: true
                        });
                    }
                });
            } else {
                items.push({
                    p: {
                        ...c,
                        isComposition: true,
                        description: c.name,
                        unitPrice: c.manual_price || c.calculatedPrice || 0,
                        code: c.sku || 'COMP',
                        category: 'Composição'
                    },
                    key: `comp-${c.id}`,
                    isComposition: true
                });
            }
        });
        
        return items;
    }, [products, compositions]);

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

    return {
        search,
        setSearch,
        loading,
        filtered
    };
};
