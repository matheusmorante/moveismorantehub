import { useState, useEffect, useMemo } from 'react';
import Product, { Variation } from '@/pages/types/product.type';
import { subscribeToProducts } from '@/pages/utils/productService';
import { normalizeSearchTerm } from "@/pages/utils/textUtils";

export const useProductSearch = (priceType: 'unit' | 'cost' = 'unit') => {
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

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

    return {
        search,
        setSearch,
        loading,
        filtered
    };
};
