import { supabase } from '@/pages/utils/supabaseConfig';

/**
 * Busca histórico de descrições já utilizadas em vendas e compras
 */
export const searchHistoricalItems = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];

    try {
        const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);

        // 1. Tentar carregar de order_items e purchase_items normalizados
        let salesDescriptions: string[] = [];
        let purchaseDescriptions: string[] = [];

        const [salesRes, purchaseRes] = await Promise.all([
            supabase
                .from('order_items')
                .select('description, orders!inner(deleted)')
                .eq('orders.deleted', false)
                .order('created_at', { ascending: false })
                .limit(100),
            supabase
                .from('purchase_items')
                .select('description')
                .order('id', { ascending: false })
                .limit(100)
        ]);

        if (!salesRes.error && salesRes.data) {
            salesDescriptions = salesRes.data.map(d => d.description || '').filter(Boolean);
        }
        if (!purchaseRes.error && purchaseRes.data) {
            purchaseDescriptions = purchaseRes.data.map(d => d.description || '').filter(Boolean);
        }

        const descriptions = new Set<string>();

        salesDescriptions.forEach((desc) => {
            const descLower = desc.toLowerCase();
            const matchesAll = words.every(word => descLower.includes(word));
            if (matchesAll) {
                descriptions.add(desc);
            }
        });

        purchaseDescriptions.forEach((desc) => {
            const descLower = desc.toLowerCase();
            const matchesAll = words.every(word => descLower.includes(word));
            if (matchesAll) {
                descriptions.add(desc);
            }
        });

        return Array.from(descriptions).slice(0, 10);
    } catch (error) {
        console.error("Erro ao buscar histórico de itens:", error);
        return [];
    }
};

/**
 * Calcula a média mensal de vendas dos últimos 90 dias de um produto ou variação
 */
export const getProductSalesStats = async (productId: string, variationId?: string): Promise<{ avgMonthlySales: number }> => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        let itemQuery = supabase
            .from('order_items')
            .select(`
                quantity,
                orders!inner (
                    created_at,
                    deleted
                )
            `)
            .eq('orders.deleted', false)
            .gte('orders.created_at', ninetyDaysAgo.toISOString())
            .eq('product_id', productId);

        if (variationId) {
            itemQuery = itemQuery.eq('variation_id', variationId);
        }

        const { data: itemData, error: itemError } = await itemQuery;
        if (!itemError && itemData) {
            const totalQty = itemData.reduce((acc, row: any) => acc + (Number(row.quantity) || 0), 0);
            return { avgMonthlySales: Math.round(totalQty / 3) };
        }

        return { avgMonthlySales: 0 };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};
