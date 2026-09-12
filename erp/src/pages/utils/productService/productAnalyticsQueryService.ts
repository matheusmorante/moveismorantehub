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

        try {
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
        } catch (err) {
            console.warn('Erro ao consultar tabelas normalizadas para histórico de descrições, usando fallback:', err);
        }

        // LEGACY FALLBACK: se nenhuma das tabelas retornou
        if (salesDescriptions.length === 0 && purchaseDescriptions.length === 0) {
            const { data: salesData } = await supabase
                .from('orders')
                .select('order_data')
                .neq('order_data->>deleted', 'true')
                .order('created_at', { ascending: false })
                .limit(100);

            const { data: purchaseData } = await supabase
                .from('purchases')
                .select('items')
                .order('id', { ascending: false })
                .limit(100);

            salesData?.forEach((row: any) => {
                const items = row.order_data?.items || [];
                items.forEach((item: any) => {
                    if (item.description) salesDescriptions.push(item.description);
                });
            });

            purchaseData?.forEach((row: any) => {
                const items = row.items || [];
                items.forEach((item: any) => {
                    if (item.description) purchaseDescriptions.push(item.description);
                });
            });
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

        // 1. Consulta na tabela normalizada order_items
        try {
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
            if (!itemError && itemData && itemData.length > 0) {
                const totalQty = itemData.reduce((acc, row: any) => acc + (Number(row.quantity) || 0), 0);
                return { avgMonthlySales: Math.round(totalQty / 3) };
            }
        } catch (err) {
            console.warn('Fallback para busca de estatísticas de vendas via JSONB:', err);
        }

        // LEGACY FALLBACK:
        let query = supabase
            .from('orders')
            .select('order_data')
            .neq('order_data->>deleted', 'true')
            .gte('created_at', ninetyDaysAgo.toISOString());

        if (variationId) {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\", \\"variationId\\": \\"${variationId}\\"}]}"`);
        } else {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\"}]}"`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data) return { avgMonthlySales: 0 };

        let totalQty = 0;
        data.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                if (item.productId === productId && (!variationId || item.variationId === variationId)) {
                    totalQty += item.quantity || 0;
                }
            });
        });

        return { avgMonthlySales: Math.round(totalQty / 3) };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};
