import { supabase } from '../supabaseClient';
import { ITEMS_PER_PAGE } from './stockPagination';

const postgrestValue = (value: string) => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, '\\$&');

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
