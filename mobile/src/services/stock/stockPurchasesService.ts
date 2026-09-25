import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE } from './stockPagination';

/**
 * Pedidos de Compra
 */
export const fetchPurchases = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) throw error;
    
    return (data || []).map(p => ({
        ...p,
        supplierName: p.supplier_name,
        totalValue: p.total_value,
        purchaseNumber: p.purchase_number
    }));
};
