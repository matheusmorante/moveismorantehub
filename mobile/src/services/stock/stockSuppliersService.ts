import { supabase } from '../supabaseClient';
import { toPersonStockOriginsRow } from '../../../../shared-utils/personStockOrigins';
import { ITEMS_PER_PAGE } from './stockPagination';
import { fetchServerOrderPage } from '../../../../shared-utils/orderListServerQuery';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import type { SupplierDeletionCounts } from '../../../../shared-utils/supplierDeletion';
import {
  buildNormalizedWordsRegex,
  buildPostgrestAccentInsensitivePattern,
} from '../../../../shared-utils/searchText';

const postgrestValue = (value: string) =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * Fornecedores
 */
export const fetchSuppliers = async (
  page: number,
  searchQuery: string = '',
  sortBy: 'full_name' | 'created_at' = 'full_name',
  sortOrder: 'asc' | 'desc' = 'asc',
  activeOnly?: boolean
) => {
  const from = page * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  const filters = [
    'or(person_type.ilike.suppliers,person_type.ilike.supplier)',
    'or(deleted.eq.false,deleted.is.null)',
  ];
  const term = searchQuery.trim();
  let query = supabase
    .from('people')
    .select(
      'id, person_type, person_type_pf_pj, full_name, social_name, nickname, cpf_cnpj, email, phone, address, active, deleted, lead_time, observation, created_at'
    )
    .or(`and(${filters.join(',')})`)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to);
  if (term) query = query.filter('search_people_supplier_text', 'imatch', buildNormalizedWordsRegex(term));
  if (activeOnly !== undefined) query = query.eq('active', activeOnly);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((s) => ({
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
    let nameQuery = supabase.from('people').select('id, full_name, nickname, social_name');
    const exactName = buildPostgrestAccentInsensitivePattern(normalizedName, 'exact');
    const emptyValue = postgrestValue('');
    nameQuery = nameQuery
      .or(
        `and(or(person_type.ilike.suppliers,person_type.ilike.supplier),or(full_name.imatch.${exactName},and(or(full_name.is.null,full_name.eq.${emptyValue}),nickname.imatch.${exactName}),and(or(full_name.is.null,full_name.eq.${emptyValue}),or(nickname.is.null,nickname.eq.${emptyValue}),social_name.imatch.${exactName})))`
      )
      .limit(1);
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
    ...toPersonStockOriginsRow(supplier),
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
    const { data, error } = await supabase.from('people').insert(dataToSave).select().single();
    if (error) throw error;
    return data;
  }
};

export const moveSupplierToTrash = async (supplierId: string) => {
  const { error } = await supabase
    .from('people')
    .update({
      deleted: true,
      deleted_at: new Date().toISOString(),
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', supplierId);
  if (error) throw error;
};

export const fetchSupplierDeletionCounts = async (
  supplierIds: string[]
): Promise<Record<string, SupplierDeletionCounts>> => {
  const ids = [...new Set(supplierIds.filter(Boolean))];
  if (!ids.length) return {};
  const { data, error } = await supabase.rpc('get_supplier_deletion_counts', {
    p_supplier_ids: ids,
  });
  if (error) throw error;
  const counts = Object.fromEntries(
    (data || []).map((row: {
      supplier_id: string;
      product_count: number | string;
      purchase_count: number | string;
      receipt_count: number | string;
      inventory_count: number | string;
      invoice_count: number | string;
      unavailability_count: number | string;
    }) => [
      String(row.supplier_id),
      {
        productCount: Number(row.product_count),
        purchaseCount: Number(row.purchase_count),
        receiptCount: Number(row.receipt_count),
        inventoryCount: Number(row.inventory_count),
        invoiceCount: Number(row.invoice_count),
        unavailabilityCount: Number(row.unavailability_count),
      },
    ])
  ) as Record<string, SupplierDeletionCounts>;
  if (ids.some((id) => !counts[id])) {
    throw new Error('A consulta não retornou todos os vínculos dos fornecedores.');
  }
  return counts;
};

export const fetchSupplierProductCounts = async (supplierIds: string[]) => {
  const counts = await fetchSupplierDeletionCounts(supplierIds);
  return Object.fromEntries(
    Object.entries(counts).map(([id, value]) => [id, value.productCount])
  );
};

export const deleteSupplierIfUnlinked = async (supplierId: string) => {
  const { data, error } = await supabase.rpc('delete_supplier_if_unlinked', {
    p_supplier_id: supplierId,
  });
  if (error) throw error;
  if (data !== true) {
    throw new Error('O fornecedor possui vínculos ou não pode ser excluído. Atualize a lista e confira novamente.');
  }
};

export const fetchSupplierPurchaseHistory = async (
  supplier: { name: string; phone?: string; email?: string },
  page = 0
) => {
  const name = supplier.name.trim();
  if (!name) return { data: [], count: 0 };
  const filters = { includeAllTypes: true, showTestOrders: true, customerExactName: name,
    customerPhone: supplier.phone || '', customerEmail: supplier.email || '',
    multiSort: [{ key: 'createdAt', order: 'desc' }] };
  const request = (customerContactMode: string) => fetchServerOrderPage(supabase, {
    filters: { ...filters, customerContactMode }, page: page + 1, pageSize: ITEMS_PER_PAGE, mode: 'erp',
  });
  let selected = await request('strict');
  if (!selected.total) selected = await request('any');
  if (!selected.ids.length) return { data: [], count: selected.total, totalSpent: selected.totalAmount };
  const { data, error } = await withAbortTimeout(supabase.from('orders')
    .select('id,created_at,customer_name,status,order_type,delivery_method,total_amount,payments_total:order_data->paymentsSummary->>totalOrderValue,order_items(description)')
    .in('id', selected.ids), 'app:historico-do-fornecedor', 15_000);
  if (error) throw error;
  const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
  return { data: selected.ids.flatMap((id) => byId.has(id) ? [byId.get(id)] : []), count: selected.total, totalSpent: selected.totalAmount };
};
