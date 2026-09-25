import { supabase } from '../supabaseClient';
import { getInvoicePageRange } from '../../features/stock/invoices/utils/invoiceList';
import type { StockMoveResult, StockMoveUpdate } from '../../features/stock/moves/domain/stockMoveTypes';

import { ITEMS_PER_PAGE } from './stockPagination';

export const getStockPeriod = (startDate?: string, endDate?: string) => ({
    start: startDate,
    end: endDate,
});

/**
 * Movimentações de Estoque
 */
export const fetchStockMoves = async (page: number, productId?: string, variationId?: string, startDate?: string, endDate?: string): Promise<StockMoveResult> => {
    const { from, to } = getInvoicePageRange(page, ITEMS_PER_PAGE);
    const period = getStockPeriod(startDate, endDate);
    
    let query = supabase
        .from('inventory_moves')
        // Keep the base query compatible with installations that have not yet
        // applied the optional reversal/status migration.
        .select('id, product_id, variation_id, type, quantity, unit_cost, date, created_at, label, observation, product_description, product_name, reason, order_id', { count: 'exact' })
        .order('date', { ascending: false })
        .range(from, to);

    if (period.start) query = query.gte('date', period.start);
    if (period.end) query = query.lte('date', period.end);
        
    if (productId) {
        query = query.eq('product_id', productId);
    }
    if (variationId) {
        query = query.eq('variation_id', variationId);
    }
        
    const { data, error, count } = await query;
        
    if (error) throw error;
    const rows = data || [];
    const productIds = [...new Set(rows.map((row: any) => row.product_id).filter(Boolean))];
    const variationIds = [...new Set(rows.map((row: any) => row.variation_id).filter(Boolean))];
    const canonicalVariationByStoredId = new Map<string, string>();
    await Promise.all(variationIds.map(async (storedId) => {
        const { data: canonicalId, error: canonicalError } = await supabase.rpc('resolve_canonical_variation_id', { p_variation_id: storedId });
        if (!canonicalError && canonicalId) canonicalVariationByStoredId.set(String(storedId), String(canonicalId));
    }));
    const canonicalVariationIds = [...new Set(variationIds.map(id => canonicalVariationByStoredId.get(String(id)) || String(id)))];
    const [{ data: products }, { data: productVariations }] = await Promise.all([
        productIds.length ? supabase.from('products').select('id, name, description, code').in('id', productIds) : Promise.resolve({ data: [] }),
        productIds.length
            ? supabase.from('product_variations').select('id, product_id, name, sku, created_at').in('product_id', productIds).order('created_at', { ascending: true })
            : Promise.resolve({ data: [] }),
    ]);
    const directVariations = productVariations || [];
    const canonicalIdsFromProductVariations = [...new Set(directVariations.map((variation: any) => String(variation.id)))];
    const variationIdsToLoad = [...new Set([...canonicalVariationIds, ...canonicalIdsFromProductVariations])];
    const { data: canonicalVariations } = variationIdsToLoad.length
        ? await supabase.from('product_variations').select('id, product_id, name, sku').in('id', variationIdsToLoad)
        : { data: [] as any[] };
    const productById = new Map((products || []).map((row: any) => [String(row.id), row]));
    const variationById = new Map((canonicalVariations || []).map((row: any) => [String(row.id), row]));
    const firstVariationByProduct = new Map<string, any>();
    directVariations.forEach((variation: any) => {
        const productKey = String(variation.product_id || '');
        if (productKey && !firstVariationByProduct.has(productKey)) firstVariationByProduct.set(productKey, variationById.get(String(variation.id)) || variation);
    });
    return { data: rows.map((row: any) => {
        const storedVariationId = String(row.variation_id || '');
        const canonicalVariationId = canonicalVariationByStoredId.get(storedVariationId) || storedVariationId;
        const variation = variationById.get(canonicalVariationId) || (!storedVariationId ? firstVariationByProduct.get(String(row.product_id || '')) : undefined);
        const effectiveVariationId = variation?.id || canonicalVariationId || undefined;
        return {
            ...row,
            // Compatibilidade de leitura para legado: o registro continua
            // sendo identificado pelo pai no banco até a migração, mas a UI
            // passa a operar com a primeira variação real, nunca com o nome do pai.
            variation_id: effectiveVariationId,
            canonical_variation_id: effectiveVariationId,
            variation_name: variation?.name,
            products: productById.get(String(row.product_id)),
            product_variations: variation,
        };
    }), totalCount: count || 0 };
};

export const updateStockMove = async (id: string, updates: StockMoveUpdate): Promise<void> => {
    const { data: oldMove, error: readError } = await supabase.from('inventory_moves').select('product_id, variation_id, type, quantity').eq('id', id).single();
    if (readError) throw readError;
    const type = updates.type === 'withdrawal' ? 'exit' : updates.type === 'balance' ? 'adjustment' : 'entry';
    const { error } = await supabase.from('inventory_moves').update({
        type,
        quantity: updates.quantity,
        date: updates.date,
        label: updates.observation.trim(),
        observation: updates.observation.trim(),
    }).eq('id', id);
    if (error) throw error;
    if (oldMove?.product_id) {
        const { recalculateInventoryAuditBalance } = await import('./stockInventoryService');
        await recalculateInventoryAuditBalance(oldMove.product_id);
    }
};

export const reverseStockMove = async (id: string, reason: string) => {
    const { data: move, error: readError } = await supabase.from('inventory_moves').select('id, product_id, observation, order_id').eq('id', id).single();
    if (readError) throw readError;
    if (!move) return;
    let metadata: Record<string, any> = {};
    try { metadata = JSON.parse(move.observation || '{}'); } catch { metadata = { note: move.observation }; }
    if (['reversed', 'cancelled'].includes(metadata.status)) return;
    if (move.order_id) {
        throw new Error('Movimentações vinculadas a pedidos não podem ser estornadas manualmente.');
    }
    const reversedAt = new Date().toISOString();
    const observation = JSON.stringify({ ...metadata, status: 'reversed', reversalReason: reason, reversedAt });
    const modern = await supabase.from('inventory_moves').update({ status: 'reversed', reason, reversal_reason: reason, reversed_at: reversedAt, observation }).eq('id', id);
    if (modern.error?.code === '42703') {
        const legacy = await supabase.from('inventory_moves').update({ reason, observation }).eq('id', id);
        if (legacy.error) throw legacy.error;
    } else if (modern.error) throw modern.error;
    if (move.product_id) {
        const { recalculateInventoryAuditBalance } = await import('./stockInventoryService');
        await recalculateInventoryAuditBalance(move.product_id);
    }
};

export { ITEMS_PER_PAGE } from './stockPagination';
export * from './stockSuppliersService';
export * from './stockPurchasesService';
export * from './stockReceiptsService';
