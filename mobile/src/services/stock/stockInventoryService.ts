import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE, getStockPeriod } from './stockMovesService';

export const INVENTORY_SCOPE_PAGE_SIZE = 100;
const inventoryScopeCache = new Map<string, any[]>();

export const fetchInventoryScopeSuppliers = async () => {
    const { data, error } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('person_type', 'suppliers')
        .eq('deleted', false)
        .order('full_name', { ascending: true })
        .range(0, 99);
    if (error) throw error;
    return data || [];
};

export const fetchInventoryScopeProducts = async (_scope: 'full' | 'supplier', _supplierId?: string) => {
    const cacheKey = 'inventory-scope:all';
    const cached = inventoryScopeCache.get(cacheKey);
    if (cached) return cached;

    const products: any[] = [];
    let page = 0;
    while (true) {
        const from = page * INVENTORY_SCOPE_PAGE_SIZE;
        const query = supabase
            .from('products')
            .select('id, name, description, stock, unit, main_supplier_id, supplier_id, supplier_ids')
            .eq('deleted', false)
            .eq('active', true)
            .eq('item_type', 'product')
            .order('name', { ascending: true })
            .range(from, from + INVENTORY_SCOPE_PAGE_SIZE - 1);

        const { data, error } = await query;
        if (error) throw error;
        products.push(...(data || []));
        if (!data || data.length < INVENTORY_SCOPE_PAGE_SIZE) break;
        page += 1;
    }

    const productIds = products.map((product) => product.id);
    const variationRows: any[] = [];
    for (let offset = 0; offset < productIds.length; offset += INVENTORY_SCOPE_PAGE_SIZE) {
        const ids = productIds.slice(offset, offset + INVENTORY_SCOPE_PAGE_SIZE);
        let variationPage = 0;
        while (true) {
            const from = variationPage * INVENTORY_SCOPE_PAGE_SIZE;
            const { data, error } = await supabase
                .from('product_variations')
                .select('id, product_id, name, stock')
                .in('product_id', ids)
                .order('name', { ascending: true })
                .range(from, from + INVENTORY_SCOPE_PAGE_SIZE - 1);
            if (error) throw error;
            variationRows.push(...(data || []));
            if (!data || data.length < INVENTORY_SCOPE_PAGE_SIZE) break;
            variationPage += 1;
        }
    }

    const variationsByProduct = new Map<string, any[]>();
    for (const variation of variationRows) {
        const key = String(variation.product_id);
        variationsByProduct.set(key, [...(variationsByProduct.get(key) || []), variation]);
    }

    const scopedProducts = products.flatMap((product) => {
        const productVariations = variationsByProduct.get(String(product.id)) || [];
        // Produto pai sem variação é inconsistência de cadastro, não um item
        // operacional de estoque. Não reintroduzir o pai como se fosse SKU.
        if (!productVariations.length) return [];
        return productVariations.map((variation) => ({
            ...product,
            id: product.id,
            variation_id: String(variation.id),
            name: variation.name || product.name || product.description,
            stock: variation.stock ?? 0,
        }));
    });

    inventoryScopeCache.set(cacheKey, scopedProducts);
    return scopedProducts;
};

export const clearInventoryScopeCache = () => inventoryScopeCache.clear();

/**
 * Sessões de Inventário
 */
export const fetchInventorySessions = async (page: number, startDate?: string, endDate?: string) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const period = getStockPeriod(startDate, endDate);
    
    let query = supabase
        .from('inventory_moves')
        .select('id, label, observation, quantity, date, created_at')
        .ilike('label', 'Inventário #%')
        .order('created_at', { ascending: false })
        .range(from, to);

    if (period.start) query = query.gte('created_at', period.start);
    if (period.end) query = query.lte('created_at', period.end);
        
    const { data: markerMoves, error } = await query;
        
    if (error) {
        console.warn('Erro ao buscar auditorias de inventário:', error);
        return [];
    }

    if (!markerMoves || markerMoves.length === 0) return [];

    const sessionCodes = markerMoves
        .map(m => {
            try {
                const data = JSON.parse(m.observation || '{}') as any;
                if (data.inventoryCode) return data.inventoryCode;
            } catch {}
            return m.label?.replace('Inventário #', '') || '';
        })
        .filter(Boolean);

    let adjustmentsData: any[] = [];
    if (sessionCodes.length > 0) {
        const expectedLabels = sessionCodes.map(code => `Ajuste lançado pelo inventário #${code}`);
        const { data, error: adjustmentsError } = await supabase
            .from('inventory_moves')
            .select('id, label, observation, product_id')
            .in('label', expectedLabels);
            
        if (adjustmentsError) {
            console.warn('Erro ao buscar ajustes dos inventários:', adjustmentsError);
        } else {
            adjustmentsData = data || [];
        }
    }

    const adjustmentsBySession = adjustmentsData.reduce((acc: Record<string, { total: number, reversed: number }>, move) => {
        const match = move.label?.match(/Ajuste lançado pelo inventário #(.+)/);
        if (match && match[1]) {
            const code = match[1].trim();
            if (!acc[code]) acc[code] = { total: 0, reversed: 0 };
            acc[code].total += 1;
            
            const isReversed = move.status === 'reversed' || (() => {
                try {
                    return JSON.parse(move.observation || '{}').status === 'reversed';
                } catch {
                    return false;
                }
            })();
            if (isReversed) {
                acc[code].reversed += 1;
            }
        }
        return acc;
    }, {});
    
    return markerMoves.map(m => {
        let productsCount = 0;
        let status = 'in_progress';
        let inventoryCode = m.id.split('-')[0];
        let responsibleName = 'Não informado';
        
        let sessionName = '';
        
        try {
            const data = JSON.parse(m.observation || '{}') as any;
            inventoryCode = data.inventoryCode || m.label?.replace('Inventário #', '') || inventoryCode;
            responsibleName = data.responsibleName || 'Não informado';
            if (data.name) sessionName = data.name;

            if (data.inventoryAudit && Array.isArray(data.items)) {
                productsCount = data.items.length;
                status = data.status || 'completed';
            } else {
                productsCount = Math.abs(m.quantity || 0);
            }
        } catch {
            productsCount = Math.abs(m.quantity || 0);
            inventoryCode = m.label?.replace('Inventário #', '') || inventoryCode;
        }

        const sessionAdjustments = adjustmentsBySession[inventoryCode] || { total: 0, reversed: 0 };

        return {
            id: m.id,
            name: sessionName || `Inventário #${inventoryCode}`,
            inventoryCode,
            responsibleName,
            status: status as 'in_progress' | 'completed' | 'pending',
            created_at: m.created_at || m.date,
            updated_at: m.created_at || m.date,
            items_count: productsCount,
            productsCount,
            adjustmentsCount: sessionAdjustments.total,
            reversedCount: sessionAdjustments.reversed
        };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getNextInventoryCode = async (): Promise<string> => {
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('observation')
        .ilike('label', 'Inventário #%')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw error;
    const lastCode = (data || []).reduce((highest, move: any) => {
        try {
            const obs = JSON.parse(move.observation || '{}');
            const codeNum = Number(obs.inventoryCode);
            return !isNaN(codeNum) ? Math.max(highest, codeNum) : highest;
        } catch {
            return highest;
        }
    }, 0);
    return String(lastCode + 1).padStart(6, '0');
};

export const fetchInventoryItems = async (sessionId: string, page: number, searchQuery: string = '') => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    let query = supabase
        .from('products')
        .select('id, name, stock')
        .order('name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(p => ({
        ...p,
        stock_quantity: p.stock || 0
    }));
};

export const searchProducts = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, stock, product_variations(id, name, sku, stock)')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);
        
    if (error) throw error;
    return (data || []).flatMap((product: any) => {
        const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
        if (variations.length === 0) return [];
        return variations.map((variation: any) => ({
            ...product,
            variation_id: variation.id,
            name: variation.name,
            variationName: variation.name,
            sku: variation.sku || product.sku,
            stock: Number(variation.stock !== undefined && variation.stock !== null ? variation.stock : product.stock || 0),
        }));
    });
};

export const fetchInventorySessionDetails = async (sessionId: string) => {
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('observation')
        .eq('id', sessionId)
        .single();
    if (error) throw error;
    try {
        return JSON.parse(data.observation || '{}');
    } catch {
        return {};
    }
};

const isEffectiveInventoryMove = (move: any) => {
    try {
        const meta = JSON.parse(move.observation || '{}');
        return !['reversed', 'cancelled'].includes(move.status) && !['reversed', 'cancelled'].includes(meta.status);
    } catch {
        return !['reversed', 'cancelled'].includes(move.status);
    }
};

const getTargetStockFromMove = (move: any): number | null => {
    try {
        const target = JSON.parse(move.observation || '{}').targetStock;
        return Number.isFinite(Number(target)) ? Number(target) : null;
    } catch {
        return null;
    }
};

const inventoryMovementDelta = (move: any) => {
    return move.type === 'entry' ? Number(move.quantity || 0)
        : move.type === 'exit' ? -Number(move.quantity || 0) : 0;
};

export const recalculateInventoryAuditBalance = async (productId: string): Promise<boolean> => {
    if (!productId) return false;
    const [{ data: productRow }, { data: rawMoves, error }] = await Promise.all([
        supabase.from('products').select('*, product_variations(*)').eq('id', productId).single(),
        supabase.from('inventory_moves').select('*').eq('product_id', productId).order('date', { ascending: true }).order('created_at', { ascending: true }).limit(500),
    ]);
    if (error) throw error;
    if (!productRow) return false;

    const moves = (rawMoves || []).filter(isEffectiveInventoryMove);
    const updatedVariations = [...(productRow.product_variations || [])];
    let hasAnchor = false;

    updatedVariations.forEach((variation: any, index: number) => {
        const variationMoves = moves.filter((move: any) => String(move.variation_id || '') === String(variation.id));
        const anchor = [...variationMoves].reverse().find(move => getTargetStockFromMove(move) !== null);
        if (!anchor) return;
        hasAnchor = true;
        let stock = getTargetStockFromMove(anchor)!;
        for (const move of variationMoves.slice(variationMoves.indexOf(anchor) + 1)) stock += inventoryMovementDelta(move);
        updatedVariations[index] = { ...variation, stock };
    });

    const lastAnchor = [...moves].reverse().find((move: any) => getTargetStockFromMove(move) !== null && !move.variation_id);
    if (!hasAnchor && !lastAnchor) return false;

    let stock = Number(productRow.stock || 0);
    if (lastAnchor) {
        stock = getTargetStockFromMove(lastAnchor)!;
        for (const move of moves.slice(moves.indexOf(lastAnchor) + 1)) stock += inventoryMovementDelta(move);
    } else {
        stock = updatedVariations.reduce((total: number, variation: any) => total + Number(variation.stock || 0), 0);
    }

    await supabase.from('products').update({ stock }).eq('id', productId);
    if (updatedVariations.length > 0) {
        for (const v of updatedVariations) {
            await supabase.from('product_variations').update({ stock: v.stock }).eq('id', v.id);
        }
    }
    return true;
};

export const reverseInventorySession = async (session: { id: string; inventoryCode?: string }): Promise<void> => {
    const code = session.inventoryCode || session.id.split('-')[0];
    const expectedLabel = `Ajuste lançado pelo inventário #${code}`;

    const { data: moves, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .eq('label', expectedLabel);

    if (error) throw error;
    if (!moves || moves.length === 0) return;

    const reversedAt = new Date().toISOString();
    const affectedProductIds = new Set<string>();

    for (const move of moves) {
        if (move.label?.startsWith('Inventário #')) continue;

        let meta: any = {};
        try { meta = JSON.parse(move.observation || '{}'); } catch { meta = {}; }
        if (meta.status === 'reversed' || move.status === 'reversed') continue;

        const updatedObs = JSON.stringify({
            ...meta,
            status: 'reversed',
            reversalReason: 'Estorno de inventário',
            reversedAt
        });

        await supabase
            .from('inventory_moves')
            .update({ status: 'reversed', observation: updatedObs, reason: 'Estorno de inventário' })
            .eq('id', move.id);

        if (move.product_id) {
            affectedProductIds.add(move.product_id);
        }
    }

    for (const prodId of affectedProductIds) {
        await recalculateInventoryAuditBalance(prodId);
    }
};

export const unreverseInventorySession = async (session: { id: string; inventoryCode?: string }): Promise<void> => {
    const code = session.inventoryCode || session.id.split('-')[0];
    const expectedLabel = `Ajuste lançado pelo inventário #${code}`;

    const { data: moves, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .eq('label', expectedLabel);

    if (error) throw error;
    if (!moves || moves.length === 0) return;

    const affectedProductIds = new Set<string>();

    for (const move of moves) {
        if (move.label?.startsWith('Inventário #')) continue;

        let meta: any = {};
        try { meta = JSON.parse(move.observation || '{}'); } catch { meta = {}; }

        const { reversalReason: _r, reversedAt: _ra, ...cleanMeta } = meta;
        const updatedObs = JSON.stringify({
            ...cleanMeta,
            status: 'effective'
        });

        await supabase
            .from('inventory_moves')
            .update({ status: 'effective', observation: updatedObs, reason: null })
            .eq('id', move.id);

        if (move.product_id) {
            affectedProductIds.add(move.product_id);
        }
    }

    for (const prodId of affectedProductIds) {
        await recalculateInventoryAuditBalance(prodId);
    }
};

export const deleteInventoryDraft = async (markerMoveId: string): Promise<void> => {
    const { error } = await supabase
        .from('inventory_moves')
        .delete()
        .eq('id', markerMoveId);

    if (error) throw error;
};

export const saveInventoryDraft = async (params: {
    markerMoveId?: string;
    code: string;
    auditId: string;
    observation: any;
    date?: string;
}): Promise<string> => {
    const { markerMoveId, code, auditId, observation, date } = params;
    const now = date || new Date().toISOString();
    const obsStr = typeof observation === 'string' ? observation : JSON.stringify(observation);

    if (markerMoveId) {
        const { error } = await supabase
            .from('inventory_moves')
            .update({
                date: now,
                observation: obsStr,
                label: `Inventário #${code}`
            })
            .eq('id', markerMoveId);
        if (error) throw error;
        return markerMoveId;
    } else {
        const { data, error } = await supabase
            .from('inventory_moves')
            .insert({
                type: 'adjustment',
                quantity: 0,
                date: now,
                label: `Inventário #${code}`,
                observation: obsStr,
                created_at: now
            })
            .select('id')
            .single();
        if (error) throw error;
        return data.id;
    }
};
