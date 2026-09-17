import { supabase } from './supabaseClient';

export const ITEMS_PER_PAGE = 15;

/**
 * Movimentações de Estoque
 */
export const fetchStockMoves = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    // In MoranteHub, inventory_moves usually has product details embedded or linked via productId
    const { data, error } = await supabase
        .from('inventory_moves')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) throw error;
    return data;
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
        .contains('roles', ['supplier'])
        .order('name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,cnpj_cpf.ilike.%${searchQuery}%`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
};

/**
 * Pedidos de Compra
 */
export const fetchPurchases = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('purchases')
        .select(`
            *,
            people ( name )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) throw error;
    return data;
};

/**
 * Notas Fiscais de Entrada
 */
export const fetchInboundInvoices = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('inbound_invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        // Fallback or ignore if table doesn't exist yet, just return empty to not crash
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
    
    // Supondo que exista uma tabela 'receipts' ou usamos purchases com status específico
    const { data, error } = await supabase
        .from('purchases') // Usando purchases como fallback para recebimentos
        .select('*, people(name)')
        .in('status', ['sent', 'partially_received'])
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) throw error;
    return data;
};

/**
 * Sessões de Inventário
 */
export const fetchInventorySessions = async (page: number) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    
    const { data, error } = await supabase
        .from('inventory_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
        
    if (error) {
        console.warn('Erro ao buscar sessões de inventário:', error);
        return [];
    }
    return data;
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
        .select('id, name, stock_quantity')
        .order('name', { ascending: true })
        .range(from, to);
        
    if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};
