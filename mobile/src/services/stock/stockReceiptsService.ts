import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE } from './stockPagination';

/**
 * Recebimentos (Entregas de fornecedores para conferência)
 */
export const fetchReceipts = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('goods_receipts')
        .select('*, goods_receipt_items(*)')
        .order('received_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar recebimentos:', error);
        return [];
    }
    
    return (data || []).map(r => ({
        ...r,
        supplierName: r.supplier_name || 'Fornecedor',
        totalValue: r.total_value || 0,
        items: Array.isArray(r.goods_receipt_items) ? r.goods_receipt_items : [],
    }));
};
