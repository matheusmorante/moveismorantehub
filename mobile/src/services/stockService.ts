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
        .select('id, full_name, cpf_cnpj, full_address')
        .eq('person_type', 'suppliers')
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
    
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .ilike('label', 'Inventário #%')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar auditorias de inventário:', error);
        return [];
    }
    
    // Convert moves into "sessions" for the UI
    return (data || []).map(m => ({
        id: m.id,
        name: `Inventário #${m.id.split('-')[0]}`,
        status: 'completed',
        created_at: m.created_at,
        updated_at: m.updated_at,
        items_count: Math.abs(m.quantity)
    }));
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
