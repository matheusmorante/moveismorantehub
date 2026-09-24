import { supabase } from '../../../services/supabaseClient';

export type PurchaseStatus = 'ordered' | 'fulfilled' | 'cancelled';

export interface MobilePurchaseItem {
  productId: string;
  variationId?: string;
  description: string;
  quantity: number;
  receivedQuantity?: number;
  baseCost: number;
  unitCost: number;
  totalCost: number;
  sku?: string;
}

export interface MobilePurchase {
  id: string;
  purchaseNumber?: number;
  supplierId?: string;
  supplierName: string;
  date: string;
  items: MobilePurchaseItem[];
  totalValue: number;
  observation?: string;
  status: PurchaseStatus;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceStatus?: string;
  fiscalKey?: string;
  attachments: string[];
  ipiPercent: number;
  freightPercent: number;
  stockProcessed: boolean;
  createdAt?: string;
}

export interface PurchaseFilters {
  supplierId?: string;
  search?: string;
}

export const PURCHASE_PAGE_SIZE = 15;

const normalizeStatus = (status: unknown): PurchaseStatus => {
  if (status === 'fulfilled') return 'fulfilled';
  if (status === 'cancelled') return 'cancelled';
  return 'ordered';
};

export const purchaseStatusLabel = (status: PurchaseStatus) => ({
  ordered: 'Em Ordem',
  fulfilled: 'Atendido',
  cancelled: 'Cancelado',
}[status]);

export const mapPurchaseFromDb = (row: any, fallbackNumber?: number): MobilePurchase => {
  const normalizedItems = Array.isArray(row.purchase_items) && row.purchase_items.length > 0
    ? [...row.purchase_items]
      .sort((a, b) => Number(a.item_index || 0) - Number(b.item_index || 0))
      .map((item: any) => ({
        productId: String(item.product_id || item.item_snapshot?.productId || ''),
        variationId: item.variation_id || item.item_snapshot?.variationId || undefined,
        description: item.description || item.item_snapshot?.description || 'Item de compra',
        quantity: Number(item.quantity || 1),
        receivedQuantity: item.item_snapshot?.receivedQuantity !== undefined
          ? Number(item.item_snapshot.receivedQuantity)
          : undefined,
        baseCost: Number(item.base_cost ?? item.item_snapshot?.baseCost ?? 0),
        unitCost: Number(item.unit_cost ?? item.item_snapshot?.unitCost ?? 0),
        totalCost: Number(item.total_cost ?? item.item_snapshot?.totalCost ?? 0),
        sku: item.item_snapshot?.sku,
      }))
    : Array.isArray(row.items)
      ? row.items.map((item: any) => ({
        productId: String(item.productId || item.product_id || ''),
        variationId: item.variationId || item.variation_id || undefined,
        description: item.description || 'Item de compra',
        quantity: Number(item.quantity || 1),
        receivedQuantity: item.receivedQuantity !== undefined ? Number(item.receivedQuantity) : undefined,
        baseCost: Number(item.baseCost ?? item.base_cost ?? 0),
        unitCost: Number(item.unitCost ?? item.unit_cost ?? 0),
        totalCost: Number(item.totalCost ?? item.total_cost ?? 0),
        sku: item.sku,
      }))
      : [];

  return {
    id: String(row.id),
    purchaseNumber: row.purchase_number ? Number(row.purchase_number) : fallbackNumber,
    supplierId: row.supplier_id || undefined,
    supplierName: row.supplier_name || 'Fornecedor não informado',
    date: row.date || row.created_at || new Date().toISOString(),
    items: normalizedItems,
    totalValue: Number(row.total_value ?? row.total_amount ?? 0),
    observation: row.observation || '',
    status: normalizeStatus(row.status),
    invoiceNumber: row.invoice_number || undefined,
    invoiceDate: row.invoice_date || undefined,
    invoiceStatus: row.invoice_status || 'pending',
    fiscalKey: row.fiscal_key || undefined,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    ipiPercent: Number(row.ipi_value || 0),
    freightPercent: Number(row.freight_percent || 0),
    stockProcessed: Boolean(row.stockProcessed ?? row.stock_processed),
    createdAt: row.created_at || undefined,
  };
};

const toDbItem = (purchaseId: string, item: MobilePurchaseItem, index: number) => ({
  purchase_id: purchaseId,
  item_index: index + 1,
  product_id: item.productId || null,
  variation_id: item.variationId || null,
  description: item.description || 'Item de compra',
  quantity: Number(item.quantity || 1),
  base_cost: Number(item.baseCost || 0),
  unit_cost: Number(item.unitCost || 0),
  total_cost: Number(item.totalCost || 0),
  item_snapshot: item,
});

const syncPurchaseItems = async (purchaseId: string, items: MobilePurchaseItem[]) => {
  const { error: deleteError } = await supabase.from('purchase_items').delete().eq('purchase_id', purchaseId);
  if (deleteError) throw deleteError;
  if (!items.length) return;
  const { error } = await supabase.from('purchase_items').insert(items.map((item, index) => toDbItem(purchaseId, item, index)));
  if (error) throw error;
};

const toDbPurchase = (purchase: Partial<MobilePurchase>) => ({
  supplier_id: purchase.supplierId || null,
  supplier_name: purchase.supplierName || null,
  date: purchase.date ? new Date(purchase.date).toISOString() : new Date().toISOString(),
  total_value: Number(purchase.totalValue || 0),
  observation: purchase.observation || '',
  status: purchase.status || 'ordered',
  invoice_number: purchase.invoiceNumber || null,
  invoice_date: purchase.invoiceDate ? new Date(purchase.invoiceDate).toISOString() : null,
  invoice_status: purchase.invoiceStatus || 'pending',
  fiscal_key: purchase.fiscalKey || null,
  attachments: purchase.attachments || [],
  ipi_value: Number(purchase.ipiPercent || 0),
  freight_percent: Number(purchase.freightPercent || 0),
  stockProcessed: Boolean(purchase.stockProcessed),
});

export const fetchMobilePurchases = async (page: number, filters: PurchaseFilters = {}) => {
  const from = page * PURCHASE_PAGE_SIZE;
  const to = from + PURCHASE_PAGE_SIZE - 1;
  let query = supabase
    .from('purchases')
    .select('*, purchase_items(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%(),]/g, ' ');
    query = query.or(`supplier_name.ilike.%${term}%,purchase_number.eq.${Number(term) || 0}`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data || []).map((row, index) => mapPurchaseFromDb(row, from + index + 1)), count: count || 0 };
};

export const fetchMobilePurchase = async (id: string) => {
  const { data, error } = await supabase.from('purchases').select('*, purchase_items(*)').eq('id', id).single();
  if (error) throw error;
  return mapPurchaseFromDb(data);
};

export const saveMobilePurchase = async (purchase: Omit<MobilePurchase, 'id'>) => {
  const { data, error } = await supabase.from('purchases').insert(toDbPurchase(purchase)).select().single();
  if (error) throw error;
  await syncPurchaseItems(String(data.id), purchase.items || []);
  return mapPurchaseFromDb({ ...data, purchase_items: purchase.items.map((item, index) => ({ ...toDbItem(String(data.id), item, index) })) });
};

export const updateMobilePurchase = async (id: string, updates: Partial<MobilePurchase>) => {
  const { error } = await supabase.from('purchases').update(toDbPurchase(updates)).eq('id', id);
  if (error) throw error;
  if (updates.items) await syncPurchaseItems(id, updates.items);
  return fetchMobilePurchase(id);
};

export const cancelMobilePurchase = async (purchase: MobilePurchase) => {
  if (purchase.status === 'cancelled') throw new Error('Este pedido de compra já está cancelado.');
  // O ERP estorna movimentos vinculados antes de cancelar. A busca mantém a
  // compatibilidade com registros normalizados e com os lançamentos antigos
  // que gravavam o pedido no order_id/observação.
  if (purchase.stockProcessed) {
    const reason = `Cancelamento do pedido de compra #${purchase.purchaseNumber || ''}`.trim();
    const searchPattern = `%${purchase.id}%`;
    const { data: moves, error: movesError } = await supabase
      .from('inventory_moves')
      .select('id, product_id, observation, label, order_id')
      .or(`order_id.eq.${purchase.id},observation.ilike.${searchPattern},label.ilike.${searchPattern}`);
    if (movesError) throw movesError;

    for (const move of moves || []) {
      let metadata: Record<string, any> = {};
      try { metadata = JSON.parse(move.observation || '{}'); } catch { metadata = { note: move.observation }; }
      if (['reversed', 'cancelled'].includes(metadata.status)) continue;
      const reversedAt = new Date().toISOString();
      const observation = JSON.stringify({ ...metadata, status: 'reversed', reversalReason: reason, reversedAt });
      const modern = await supabase.from('inventory_moves').update({ status: 'reversed', reason, reversal_reason: reason, reversed_at: reversedAt, observation }).eq('id', move.id);
      if (modern.error?.code === '42703' || modern.error?.code === 'PGRST204') {
        const legacy = await supabase.from('inventory_moves').update({ reason, observation }).eq('id', move.id);
        if (legacy.error) throw legacy.error;
      } else if (modern.error) throw modern.error;
      if (move.product_id) {
        const { recalculateInventoryAuditBalance } = await import('../../../services/stock/stockInventoryService');
        await recalculateInventoryAuditBalance(move.product_id);
      }
    }
  }
  return updateMobilePurchase(purchase.id, { status: 'cancelled', stockProcessed: false });
};
