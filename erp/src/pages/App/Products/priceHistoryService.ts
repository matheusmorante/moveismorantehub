import { supabase } from '@/pages/utils/supabaseConfig';
import { calculateLotBalances } from './priceHistoryBalance';
import type { InventoryMoveEntry, PriceHistoryEntry } from './priceHistory.types';

export async function loadPriceHistory(productId?: string): Promise<PriceHistoryEntry[]> {
    let query = supabase
        .from('product_price_history')
        .select('*, products(description)')
        .order('changed_at', { ascending: false });

    if (productId) {
        query = query.eq('product_id', productId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((item) => ({
        ...item,
        product_description: item.products?.description,
    }));
}

export async function loadBatchHistory(productId?: string): Promise<InventoryMoveEntry[]> {
    let entryQuery = supabase
        .from('inventory_moves')
        .select('*')
        .eq('type', 'entry')
        .order('date', { ascending: false });

    if (productId) {
        entryQuery = entryQuery.eq('product_id', productId);
    }

    const { data: entries, error: entryError } = await entryQuery;
    if (entryError) throw entryError;

    const entryIds = entries?.map((entry) => entry.id) || [];
    if (entryIds.length === 0) {
        return calculateLotBalances(entries || [], []);
    }

    const { data: withdrawals, error: withdrawalError } = await supabase
        .from('inventory_moves')
        .select('parent_move_id, quantity')
        .eq('type', 'withdrawal')
        .in('parent_move_id', entryIds);

    if (withdrawalError) throw withdrawalError;

    return calculateLotBalances(entries || [], withdrawals || []);
}
