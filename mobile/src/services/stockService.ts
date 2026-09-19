import { supabase } from './supabaseClient';

export const ITEMS_PER_PAGE = 15;

/**
 * Movimentações de Estoque
 */
export const fetchStockMoves = async (page: number, productId?: string) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    // In MoranteHub, inventory_moves usually has product details embedded or linked via productId
    let query = supabase
        .from('inventory_moves')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (productId) {
        query = query.eq('product_id', productId);
    }
        
    const { data, error, count } = await query;
        
    if (error) throw error;
    return { data, totalCount: count || 0 };
};

/**
 * Fornecedores
 */
export const fetchSuppliers = async (page: number, searchQuery: string = '') => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    let query = supabase
        .from('people')
        .select('*')
        .eq('person_type', 'suppliers')
        .eq('deleted', false)
        .order('full_name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,cpf_cnpj.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(s => ({
        ...s,
        // Aliases para compatibilidade com o mapper do useSuppliers
        name: s.full_name || '',
        document_number: s.cpf_cnpj || '',
        city: s.full_address?.city || s.full_address?.cidade || '',
        state: s.full_address?.state || s.full_address?.estado || '',
    }));
};

export const saveSupplier = async (supplier: any) => {
    const { id, ...dataToSave } = supplier;
    dataToSave.person_type = 'suppliers';
    dataToSave.active = dataToSave.active !== undefined ? dataToSave.active : true;
    
    if (id) {
        const { data, error } = await supabase
            .from('people')
            .update(dataToSave)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('people')
            .insert(dataToSave)
            .select()
            .single();
        if (error) throw error;
        return data;
    }
};

export const fetchSupplierProductCounts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('id, supplier_id, main_supplier_id, supplier_ids')
        .eq('deleted', false)
        .eq('item_type', 'product');
    
    if (error) {
        console.error('Não foi possível carregar os produtos dos fornecedores:', error);
        return {};
    }
    
    const counts: Record<string, number> = {};
    (data || []).forEach((product) => {
        const supplierIds = new Set([...(product.supplier_ids || []), product.main_supplier_id, product.supplier_id].filter(Boolean));
        supplierIds.forEach((supplierId) => { counts[String(supplierId)] = (counts[String(supplierId)] || 0) + 1; });
    });
    return counts;
};

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
    
    // Map to camelCase for the UI
    return (data || []).map(p => ({
        ...p,
        supplierName: p.supplier_name,
        totalValue: p.total_value,
        purchaseNumber: p.purchase_number
    }));
};

/**
 * Notas Fiscais de Entrada
 */
export const fetchInboundInvoices = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('inbound_invoices')
        .select('*, inbound_invoice_items(*)')
        .order('data_emissao', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar NFs:', error);
        return [];
    }
    return data;
};

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

/**
 * Sessões de Inventário
 */
export const fetchInventorySessions = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data: markerMoves, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .ilike('label', 'Inventário #%')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar auditorias de inventário:', error);
        return [];
    }

    if (!markerMoves || markerMoves.length === 0) return [];

    // Collect session codes from labels to fetch their adjustments
    const sessionCodes = markerMoves
        .map(m => {
            try {
                const data = JSON.parse(m.observation || '{}') as any;
                if (data.inventoryCode) return data.inventoryCode;
            } catch {}
            return m.label?.replace('Inventário #', '') || '';
        })
        .filter(Boolean);

    // Fetch adjustment moves to calculate adjustmentsCount and reversedCount
    // We cannot use IN on a like pattern easily, so we just fetch all adjustments and filter in memory since it's paginated on the marker side anyway, OR we construct an OR query
    let adjustmentsData: any[] = [];
    if (sessionCodes.length > 0) {
        const expectedLabels = sessionCodes.map(code => `Ajuste lançado pelo inventário #${code}`);
        console.log('UI LOG: stockService expectedLabels', expectedLabels);
        const { data, error: adjustmentsError } = await supabase
            .from('inventory_moves')
            .select('label')
            .in('label', expectedLabels);
            
        if (adjustmentsError) {
            console.warn('Erro ao buscar ajustes dos inventários:', adjustmentsError);
        } else {
            adjustmentsData = data || [];
            console.log('UI LOG: stockService adjustmentsData', adjustmentsData);
        }
    }

    const adjustmentsBySession = adjustmentsData.reduce((acc: Record<string, { total: number, reversed: number }>, move) => {
        const match = move.label?.match(/Ajuste lançado pelo inventário #(.+)/);
        if (match && match[1]) {
            const code = match[1].trim();
            if (!acc[code]) acc[code] = { total: 0, reversed: 0 };
            acc[code].total += 1;
            // Removed move.status check since status column doesn't exist
        }
        return acc;
    }, {});
    console.log('UI LOG: stockService adjustmentsBySession', adjustmentsBySession);
    
    // Convert moves into "sessions" for the UI by parsing observation
    return markerMoves.map(m => {
        let productsCount = 0;
        let status = 'in_progress';
        let inventoryCode = m.id.split('-')[0];
        let responsibleName = 'Não informado';
        
        try {
            const data = JSON.parse(m.observation || '{}') as any;
            
            // Extracted from observation if possible, falling back to label
            inventoryCode = data.inventoryCode || m.label?.replace('Inventário #', '') || inventoryCode;
            responsibleName = data.responsibleName || 'Não informado';

            if (data.inventoryAudit && Array.isArray(data.items)) {
                productsCount = data.items.length;
                status = data.status || 'completed';
            } else {
                productsCount = Math.abs(m.quantity || 0); // fallback
            }
        } catch {
            productsCount = Math.abs(m.quantity || 0);
            inventoryCode = m.label?.replace('Inventário #', '') || inventoryCode;
        }

        const sessionAdjustments = adjustmentsBySession[inventoryCode] || { total: 0, reversed: 0 };

        return {
            id: m.id,
            name: `Inventário #${inventoryCode}`,
            inventoryCode,
            responsibleName,
            status: status as 'in_progress' | 'completed' | 'pending',
            created_at: m.created_at || m.date,
            updated_at: m.updated_at || m.date,
            items_count: productsCount, // Keep for fallback
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
        .ilike('label', 'Inventário #%');

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

/**
 * Itens para contagem do inventário (Paginado)
 */
export const fetchInventoryItems = async (sessionId: string, page: number, searchQuery: string = '') => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    // Aqui seria idealmente a tabela products, para podermos contar todos
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

/**
 * Buscar produtos (para suggestions/search input)
 */
export const searchProducts = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);
        
    if (error) throw error;
    return data;
};

export const fetchInventorySessionDetails = async (sessionId: string) => {
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .eq('id', sessionId)
        .single();
    if (error) throw error;
    try {
        return JSON.parse(data.observation || '{}');
    } catch {
        return {};
    }
};
