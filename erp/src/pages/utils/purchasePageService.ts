import { supabase } from './supabaseConfig';
import { mapPurchaseFromDB, subscribeToPurchaseMutations } from './purchaseService';
import type Purchase from '../types/purchase.type';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';

export const PURCHASE_LIST_PAGE_SIZE = 15;

// purchase_number não existe no esquema atual; sem número persistido, a interface usa o ID.
export const PURCHASE_PAGE_COLUMNS = [
  'id', 'supplier_id', 'supplier_name', 'date', 'items', 'total_value', 'observation',
  'status', 'invoice_number', 'invoice_date', 'invoice_status', 'fiscal_key',
  'attachments', 'discount_percent', 'ipi_value', 'freight_percent', 'created_at',
  'stockProcessed',
  'purchase_items(item_index,product_id,variation_id,description,quantity,base_cost,unit_cost,total_cost,item_snapshot)',
].join(',');

export const fetchPurchasesPage = async (
  page: number,
  options: { supplierId?: string; signal?: AbortSignal } = {},
): Promise<{ data: Purchase[]; total: number }> => {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (safePage - 1) * PURCHASE_LIST_PAGE_SIZE;
  let query = supabase.from('purchases').select(PURCHASE_PAGE_COLUMNS, { count: 'exact' });
  if (options.supplierId) query = query.eq('supplier_id', options.supplierId);
  const { data, error, count } = await withAbortTimeout(
    query
      .order('date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false })
      .range(from, from + PURCHASE_LIST_PAGE_SIZE - 1),
    'purchases:page', 10_000, options.signal,
  );

  if (error?.code === 'PGRST103') {
    let countQuery = supabase.from('purchases').select('id', { count: 'exact', head: true });
    if (options.supplierId) countQuery = countQuery.eq('supplier_id', options.supplierId);
    const result = await withAbortTimeout(countQuery, 'purchases:page-count', 10_000, options.signal);
    if (result.error) throw result.error;
    return { data: [], total: result.count || 0 };
  }
  if (error) throw error;
  return { data: (data || []).map((row) => mapPurchaseFromDB(row)), total: count || 0 };
};

export const fetchPurchaseById = async (
  id: string,
  signal?: AbortSignal,
): Promise<Purchase | null> => {
  const { data, error } = await withAbortTimeout(
    supabase.from('purchases').select(PURCHASE_PAGE_COLUMNS).eq('id', id).maybeSingle(),
    'purchases:detail', 10_000, signal,
  );
  if (error) throw error;
  return data ? mapPurchaseFromDB(data) : null;
};

export const subscribeToPurchasePageChanges = (callback: () => void) => {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hasConnected = false;
  const notify = () => { if (active) callback(); };
  const schedule = () => {
    if (!active) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(notify, 3000);
  };
  const unsubscribeMutations = subscribeToPurchaseMutations(notify);
  const channel = supabase.channel('purchase_page_changes_' + Date.now())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchases' }, schedule)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'purchase_items' }, schedule)
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') return;
      if (hasConnected) schedule();
      hasConnected = true;
    });
  if (typeof window !== 'undefined') window.addEventListener('online', schedule);
  return () => {
    active = false;
    if (timer) clearTimeout(timer);
    unsubscribeMutations();
    if (typeof window !== 'undefined') window.removeEventListener('online', schedule);
    void supabase.removeChannel(channel);
  };
};
