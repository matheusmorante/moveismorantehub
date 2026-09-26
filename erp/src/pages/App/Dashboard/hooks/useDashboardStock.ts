import { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseConfig';
import { subscribeToInventoryMoves } from '../../../utils/inventoryService';

export interface LowStockItem {
    productId: string;
    variationId?: string;
    name: string;
    stock: number;
    minStock: number;
    isZero: boolean;
}

export interface StockData {
    zeroStockCount: number;
    lowStockCount: number;
    lowStockItems: LowStockItem[];
    pendingInventory: { code: string; date: string; responsibleName?: string } | null;
    loading: boolean;
}

export const useDashboardStock = (): StockData => {
    const [zeroStockCount, setZeroStockCount] = useState(0);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
    const [pendingInventory, setPendingInventory] = useState<{ code: string; date: string; responsibleName?: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                // Inclui produtos legados (item_type NULL) e produtos físicos
                const { data, error } = await supabase
                    .from('products')
                    .select('id, description, stock, min_stock, has_variations, active, deleted_at')
                    .is('deleted_at', null)
                    .eq('active', true)
                    .or('item_type.eq.product,item_type.is.null');

                if (error) throw error;

                const products = data || [];

                // Buscar variações ativas de produtos com variações
                const productIdsWithVariations = products
                    .filter(p => p.has_variations)
                    .map(p => p.id);

                const variationsByProductId: Record<string, any[]> = {};
                if (productIdsWithVariations.length > 0) {
                    const { data: variationRows } = await supabase
                        .from('product_variations')
                        .select('id, product_id, name, sku, stock, active')
                        .in('product_id', productIdsWithVariations)
                        .eq('active', true);

                    for (const v of variationRows ?? []) {
                        if (!variationsByProductId[v.product_id]) {
                            variationsByProductId[v.product_id] = [];
                        }
                        variationsByProductId[v.product_id].push(v);
                    }
                }

                const items: LowStockItem[] = [];
                let zero = 0;
                let low = 0;

                for (const p of products) {
                    const variations = variationsByProductId[p.id];
                    if (p.has_variations && variations && variations.length > 0) {
                        for (const v of variations) {
                            const stock = Number(v.stock ?? 0);
                            const minStock = Number(p.min_stock ?? 0);
                            if (stock === 0) {
                                zero++;
                                items.push({ productId: p.id, variationId: v.id, name: `${p.description} — ${v.name || v.sku}`, stock, minStock, isZero: true });
                            } else if (minStock > 0 && stock <= minStock) {
                                low++;
                                items.push({ productId: p.id, variationId: v.id, name: `${p.description} — ${v.name || v.sku}`, stock, minStock, isZero: false });
                            }
                        }
                    } else {
                        const stock = Number(p.stock ?? 0);
                        const minStock = Number(p.min_stock ?? 0);
                        if (stock === 0) {
                            zero++;
                            items.push({ productId: p.id, name: p.description, stock, minStock, isZero: true });
                        } else if (minStock > 0 && stock <= minStock) {
                            low++;
                            items.push({ productId: p.id, name: p.description, stock, minStock, isZero: false });
                        }
                    }
                }

                items.sort((a, b) => (a.isZero === b.isZero ? a.stock - b.stock : a.isZero ? -1 : 1));

                setZeroStockCount(zero);
                setLowStockCount(low);
                setLowStockItems(items.slice(0, 8));
            } catch (e) {
                console.error('useDashboardStock products:', e);
            }
        };

        fetch();
    }, []);

    useEffect(() => {
        const unsub = subscribeToInventoryMoves((moves: any[]) => {
            try {
                const inProgress = moves.find(m => {
                    try {
                        const obs = JSON.parse(m.observation || '{}');
                        return obs.inventoryAudit === true && obs.status === 'in_progress';
                    } catch { return false; }
                });

                if (inProgress) {
                    try {
                        const obs = JSON.parse(inProgress.observation || '{}');
                        setPendingInventory({
                            code: obs.inventoryCode || '—',
                            date: inProgress.date || '',
                            responsibleName: obs.responsibleName,
                        });
                    } catch {
                        setPendingInventory({ code: '—', date: inProgress.date || '' });
                    }
                } else {
                    setPendingInventory(null);
                }
            } catch { setPendingInventory(null); }
            setLoading(false);
        });
        return () => unsub?.();
    }, []);

    return { zeroStockCount, lowStockCount, lowStockItems, pendingInventory, loading };
};
