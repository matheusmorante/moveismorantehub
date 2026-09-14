import { supabase } from '@/pages/utils/supabaseConfig';
import { calculateLotBalances } from './priceHistoryBalance';
import type { InventoryMoveEntry, PriceHistoryEntry } from './priceHistory.types';

interface RawPriceHistoryRow extends Omit<PriceHistoryEntry, 'product_description'> {
    readonly products?: { readonly description?: string | null } | null;
}

/**
 * Carrega o histórico de alterações de preço para um produto específico ou para todos.
 * @param productId Identificador opcional do produto
 * @returns Lista normalizada de eventos de alteração de preço
 */
export async function loadPriceHistory(productId?: string): Promise<PriceHistoryEntry[]> {
    try {
        let query = supabase
            .from('product_price_history')
            .select('*, products(description)')
            .order('changed_at', { ascending: false });

        if (productId) {
            query = query.eq('product_id', productId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []) as unknown as readonly RawPriceHistoryRow[];
        return rows.map((item) => ({
            ...item,
            product_description: item.products?.description ?? '',
        }));
    } catch (err: unknown) {
        console.error('[loadPriceHistory] Falha ao consultar histórico de preços:', err);
        throw err;
    }
}

/**
 * Carrega as movimentações de entrada e calcula o saldo residual de cada lote.
 * @param productId Identificador opcional do produto
 * @returns Lista de lotes com saldo atual calculado de forma pura
 */
export async function loadBatchHistory(productId?: string): Promise<InventoryMoveEntry[]> {
    try {
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

        const safeEntries = entries || [];
        const entryIds = safeEntries.map((entry) => entry.id).filter(Boolean);
        if (entryIds.length === 0) {
            return calculateLotBalances(safeEntries, []);
        }

        const { data: withdrawals, error: withdrawalError } = await supabase
            .from('inventory_moves')
            .select('parent_move_id, quantity')
            .eq('type', 'withdrawal')
            .in('parent_move_id', entryIds);

        if (withdrawalError) throw withdrawalError;

        return calculateLotBalances(safeEntries, withdrawals || []);
    } catch (err: unknown) {
        console.error('[loadBatchHistory] Falha ao carregar histórico de lotes:', err);
        throw err;
    }
}

