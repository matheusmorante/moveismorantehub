import { supabase } from '../supabaseClient';
import { getInvoicePageRange } from '../../features/stock/invoices/utils/invoiceList';

export const ITEMS_PER_PAGE = 15;

const postgrestValue = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

export const getStockPeriod = (startDate?: string, endDate?: string) => ({
    start: startDate,
    end: endDate,
});

/**
 * Movimentações de Estoque
 */
export const fetchStockMoves = async (page: number, productId?: string, variationId?: string, startDate?: string, endDate?: string) => {
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

export const updateStockMove = async (id: string, updates: { type: 'entry' | 'withdrawal' | 'balance'; quantity: number; date: string; observation: string }) => {
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

/**
 * Fornecedores
 */
export const fetchSuppliers = async (page: number, searchQuery: string = '', sortBy: 'full_name' | 'created_at' = 'full_name', sortOrder: 'asc' | 'desc' = 'asc', activeOnly?: boolean) => {
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const filters = [
        'or(person_type.ilike.suppliers,person_type.ilike.supplier)',
        'or(deleted.eq.false,deleted.is.null)',
    ];
    const term = searchQuery.trim();
    if (term) {
        const pattern = postgrestValue(`%${escapeLikePattern(term)}%`);
        filters.push(`or(full_name.ilike.${pattern},nickname.ilike.${pattern},cpf_cnpj.ilike.${pattern},email.ilike.${pattern})`);
    }
    
    let query = supabase
        .from('people')
        .select('id, person_type, person_type_pf_pj, full_name, social_name, nickname, cpf_cnpj, email, phone, address, active, deleted, lead_time, observation, created_at')
        .or(`and(${filters.join(',')})`)
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to);
    if (activeOnly !== undefined) query = query.eq('active', activeOnly);
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(s => ({
        ...s,
        name: s.full_name || '',
        document_number: s.cpf_cnpj || '',
        person_type_pf_pj: s.person_type_pf_pj || 'PF',
        trade_name: s.nickname || '',
        full_address: s.address || {},
        city: s.address?.city || s.address?.cidade || '',
        state: s.address?.state || s.address?.estado || '',
    }));
};

export const saveSupplier = async (supplier: any) => {
    const { id } = supplier;
    const normalizedName = String(supplier.fullName ?? supplier.full_name ?? '').trim();
    if (normalizedName) {
        let nameQuery = supabase
            .from('people')
            .select('id, full_name, nickname, social_name');
        const exactName = postgrestValue(escapeLikePattern(normalizedName));
        const emptyValue = postgrestValue('');
        nameQuery = nameQuery.or(`and(or(person_type.ilike.suppliers,person_type.ilike.supplier),or(full_name.ilike.${exactName},and(or(full_name.is.null,full_name.eq.${emptyValue}),nickname.ilike.${exactName}),and(or(full_name.is.null,full_name.eq.${emptyValue}),or(nickname.is.null,nickname.eq.${emptyValue}),social_name.ilike.${exactName})))`).limit(1);
        if (id) nameQuery = nameQuery.neq('id', id);
        const { data: matches, error: lookupError } = await nameQuery;
        if (lookupError) throw lookupError;
        if ((matches || []).length > 0) {
            throw new Error('Já existe um fornecedor cadastrado com este nome.');
        }
    }
    if (!id) {
        const identifierFilters = [
            ['cpf_cnpj', supplier.cpfCnpj ?? supplier.cpf_cnpj],
            ['email', supplier.email],
            ['phone', supplier.phone],
        ]
            .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
            .map(([column, value]) => `${column}.eq.${postgrestValue(String(value))}`);
        if (identifierFilters.length) {
            const { data: duplicates, error: duplicateError } = await supabase
                .from('people')
                .select('id')
                .ilike('person_type', 'supplier%')
                .or(identifierFilters.join(','))
                .limit(1);
            if (duplicateError) throw duplicateError;
            if (duplicates?.length) throw new Error('Este fornecedor já está cadastrado.');
        }
    }
    const dataToSave = {
        person_type: 'suppliers',
        person_type_pf_pj: supplier.personType ?? supplier.person_type_pf_pj ?? 'PF',
        full_name: supplier.fullName ?? supplier.full_name ?? '',
        nickname: supplier.tradeName ?? supplier.nickname ?? '',
        cpf_cnpj: supplier.cpfCnpj ?? supplier.cpf_cnpj ?? '',
        lead_time: supplier.leadTime ?? supplier.lead_time ?? 0,
        email: supplier.email ?? '',
        phone: supplier.phone ?? '',
        address: supplier.fullAddress ?? supplier.address ?? {},
        observation: supplier.observation ?? supplier.observations ?? '',
        active: supplier.active !== undefined ? supplier.active : true,
        deleted: supplier.deleted ?? false,
        is_draft: false,
        updated_at: new Date().toISOString(),
    };
    
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

export const moveSupplierToTrash = async (supplierId: string) => {
    const { error } = await supabase
        .from('people')
        .update({ deleted: true, deleted_at: new Date().toISOString(), active: false, updated_at: new Date().toISOString() })
        .eq('id', supplierId);
    if (error) throw error;
};

export const fetchSupplierProductCounts = async (supplierIds: string[]) => {
    const ids = [...new Set(supplierIds.filter(Boolean))];
    if (!ids.length) return {};
    const { data, error } = await supabase.rpc('get_supplier_product_counts', { p_supplier_ids: ids });
    if (error) throw error;
    return Object.fromEntries((data || []).map((row: { supplier_id: string; product_count: number | string }) => [String(row.supplier_id), Number(row.product_count)]));
};

export const fetchSupplierPurchaseHistory = async (supplier: { name: string; phone?: string; email?: string }, page = 0) => {
    const name = supplier.name.trim();
    if (!name) return { data: [], count: 0 };
    const namePattern = postgrestValue(escapeLikePattern(name));
    const emptyValue = postgrestValue('');
    const exactPersonField = (column: string, jsonPath: string, value: string) =>
        `or(${column}.eq.${postgrestValue(value)},and(or(${column}.is.null,${column}.eq.${emptyValue}),${jsonPath}.eq.${postgrestValue(value)}))`;
    const identityFilters = [
        'or(deleted.eq.false,deleted.is.null)',
        `or(customer_name.ilike.${namePattern},and(or(customer_name.is.null,customer_name.eq.${emptyValue}),order_data->customerData->>fullName.ilike.${namePattern}))`,
    ];
    if (supplier.phone) identityFilters.push(exactPersonField('customer_phone', 'order_data->customerData->>phone', supplier.phone));
    if (supplier.email) identityFilters.push(exactPersonField('customer_email', 'order_data->customerData->>email', supplier.email));
    const from = page * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const pageQuery = supabase
        .from('orders')
        .select('id, created_at, customer_name, customer_phone, customer_email, status, order_type, delivery_method, total_amount, payments_total:order_data->paymentsSummary->>totalOrderValue, order_items(description)', { count: 'exact' })
        .or(`and(${identityFilters.join(',')})`)
        .order('created_at', { ascending: false })
        .range(from, to);
    const summaryQuery = page === 0
        ? supabase.rpc('get_supplier_purchase_history_totals', {
            p_supplier_name: name,
            p_supplier_phone: supplier.phone?.trim() || null,
            p_supplier_email: supplier.email?.trim() || null,
        })
        : null;
    const [pageResult, summaryResult] = await Promise.all([pageQuery, summaryQuery]);
    if (pageResult.error) throw pageResult.error;
    let totalSpent: number | undefined;
    if (summaryResult?.error) {
        console.error('Não foi possível calcular o total gasto no histórico do fornecedor:', summaryResult.error);
    } else if (summaryResult?.data) {
        totalSpent = Number(summaryResult.data[0]?.total_spent ?? 0);
    }
    return { data: pageResult.data || [], count: pageResult.count || 0, totalSpent };
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
    
    return (data || []).map(p => ({
        ...p,
        supplierName: p.supplier_name,
        totalValue: p.total_value,
        purchaseNumber: p.purchase_number
    }));
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
