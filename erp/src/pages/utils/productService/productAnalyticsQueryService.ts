import { supabase } from '@/pages/utils/supabaseConfig';

/**
 * Busca histórico de descrições já utilizadas em vendas e compras
 */
export const searchHistoricalItems = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];

    try {
        const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);

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

        const descriptions = new Set<string>();

        salesData?.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
        });

        purchaseData?.forEach((row: any) => {
            const items = row.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
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
