import React from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import Product from '../../../types/product.type';

let oppCache: Record<string, string> | null = null;
let oppPromise: Promise<Record<string, string>> | null = null;

export const fetchOppMap = async (): Promise<Record<string, string>> => {
    if (oppCache) return oppCache;
    if (!oppPromise) {
        oppPromise = (async () => {
            const { data } = await supabase.from('opportunities').select('id, name');
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((item: any) => { map[item.id] = item.name; });
            }
            oppCache = map;
            return map;
        })();
    }
    return oppPromise;
};

let supplierCache: Record<string, string> | null = null;
let supplierPromise: Promise<Record<string, string>> | null = null;

export const fetchSupplierMap = async (): Promise<Record<string, string>> => {
    if (supplierCache) return supplierCache;
    if (!supplierPromise) {
        supplierPromise = (async () => {
            const { data } = await supabase
                .from('people')
                .select('id, full_name, nickname, social_name')
                .or('person_type.ilike.suppliers,person_type.ilike.supplier');
            const map: Record<string, string> = {};
            if (data) {
                data.forEach((item: any) => {
                    map[item.id] = item.nickname || item.full_name || item.social_name || '';
                });
            }
            supplierCache = map;
            return map;
        })();
    }
    return supplierPromise;
};

/**
 * Hook para carregar dinamicamente o nome da oportunidade e fornecedores de um produto
 */
export function useProductMetadata(product: Product) {
    const [oppName, setOppName] = React.useState<string | null>(
        product.opportunityName || product.opportunity?.name || null
    );
    const [supplierNames, setSupplierNames] = React.useState<string[]>([]);

    React.useEffect(() => {
        let isMounted = true;
        if (product.opportunityId) {
            fetchOppMap().then(map => {
                if (isMounted && map && product.opportunityId && map[product.opportunityId]) {
                    setOppName(map[product.opportunityId]);
                }
            });
        } else {
            setOppName(product.opportunityName || product.opportunity?.name || null);
        }
        return () => { isMounted = false; };
    }, [product.opportunityId, product.opportunityName, product.opportunity]);

    React.useEffect(() => {
        let isMounted = true;
        const rawIds = [
            product.mainSupplierId,
            product.supplierId,
            (product as any).main_supplier_id,
            (product as any).supplier_id,
            ...(product.supplierIds || (product as any).supplier_ids || [])
        ];
        const sIds = Array.from(new Set(rawIds.filter(Boolean))).map(String);

        if (sIds.length > 0) {
            fetchSupplierMap().then(map => {
                if (!isMounted) return;
                const resolvedNames: string[] = [];
                sIds.forEach(id => {
                    if (map && map[id]) resolvedNames.push(map[id]);
                });
                if (resolvedNames.length === 0) {
                    const fallback = (product as any).supplierName || (product as any).supplier?.name || (product as any).supplier || null;
                    if (fallback) resolvedNames.push(fallback);
                }
                setSupplierNames(Array.from(new Set(resolvedNames)));
            });
        } else {
            const fallback = (product as any).supplierName || (product as any).supplier?.name || (product as any).supplier || null;
            setSupplierNames(fallback ? [fallback] : []);
        }
        return () => { isMounted = false; };
    }, [
        product.mainSupplierId,
        product.supplierId,
        (product as any).main_supplier_id,
        (product as any).supplier_id,
        JSON.stringify(product.supplierIds || (product as any).supplier_ids || [])
    ]);

    return { oppName, supplierNames };
}
