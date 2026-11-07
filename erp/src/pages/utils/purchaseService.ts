import { supabase } from '@/pages/utils/supabaseConfig';
import Purchase from '../types/purchase.type';
import { cancelInventoryMovesByRelatedEntity } from '@/pages/utils/inventoryService';
import { formatPurchaseNumber } from '../../../../shared-utils/purchaseNumber';

const TABLE_NAME = 'purchases';

let currentPurchases: Purchase[] = [];
let listeners: Array<(purchases: Purchase[]) => void> = [];
const mutationListeners = new Set<() => void>();

export const subscribeToPurchaseMutations = (callback: () => void) => {
  mutationListeners.add(callback);
  return () => { mutationListeners.delete(callback); };
};

const notifyListeners = (localMutation = true) => {
  listeners.forEach((listener) => {
    try {
      listener([...currentPurchases]);
    } catch (e) {
      console.error('Erro ao notificar listener de compras:', e);
    }
  });
  if (localMutation) mutationListeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.error('Erro ao atualizar página de compras:', error);
    }
  });
};

const assignPurchaseNumbers = (rawPurchases: any[]): Purchase[] => {
  // Ordena do mais antigo para o mais novo para atribuir números sequenciais 1, 2, 3...
  const sortedAsc = [...rawPurchases].sort((a, b) => {
    const timeA = new Date(a.created_at || a.date).getTime();
    const timeB = new Date(b.created_at || b.date).getTime();
    return timeA - timeB;
  });

  const mapped = sortedAsc.map((p, index) => mapFromDB(p, index + 1));

  // Retorna ordenado decrescente por data para a interface
  return mapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const isValidUuid = (val?: string) =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

const syncPurchaseItems = async (purchaseId: string, items: any[]) => {
  if (!isValidUuid(purchaseId)) return;
  try {
    const { error: deleteError } = await supabase
      .from('purchase_items')
      .delete()
      .eq('purchase_id', purchaseId);
    if (deleteError) throw deleteError;

    if (items && items.length > 0) {
      const rows = items.map((item, index) => ({
        purchase_id: purchaseId,
        item_index: index + 1,
        product_id: item.productId || null,
        variation_id: item.variationId || null,
        description: item.description || 'Item de Compra',
        quantity: Number(item.quantity || 1),
        base_cost: Number(item.baseCost || 0),
        unit_cost: Number(item.unitCost || 0),
        total_cost: Number(
          item.totalCost || Number(item.quantity || 1) * Number(item.unitCost || 0)
        ),
        item_snapshot: item,
      }));
      const { error: insertError } = await supabase.from('purchase_items').insert(rows);
      if (insertError) throw insertError;
    }
  } catch (err) {
    console.error('[Purchase] Falha ao sincronizar purchase_items:', err);
    throw err;
  }
};

export const reverseInventoryMoves = async (
  purchaseOrId: Purchase | string,
  customReason?: string
) => {
  const purchaseId = typeof purchaseOrId === 'string' ? purchaseOrId : purchaseOrId.id!;
  const purchase =
    typeof purchaseOrId === 'object'
      ? purchaseOrId
      : currentPurchases.find((p) => p.id === purchaseId);
  const supplierName =
    purchase?.supplierName ||
    (purchase as any)?.supplier?.name ||
    (purchase as any)?.supplier?.tradeName ||
    '';
  const purchaseNum = formatPurchaseNumber(purchase?.purchaseNumber) || purchaseId?.slice(-4) || '—';
  const reason =
    customReason ||
    (supplierName
      ? `Cancelamento do pedido de compra #${purchaseNum} - ${supplierName}`
      : `Cancelamento do pedido de compra #${purchaseNum}`);

  await cancelInventoryMovesByRelatedEntity(purchaseId, 'purchase_order', reason);

  await supabase.from(TABLE_NAME).update({ stockProcessed: false }).eq('id', purchaseId);

  currentPurchases = currentPurchases.map((p) =>
    p.id === purchaseId ? { ...p, stockProcessed: false } : p
  );
  notifyListeners();
};

export const cancelPurchase = async (purchase: Purchase): Promise<void> => {
  if (!purchase.id) return;

  if (purchase.status === 'cancelled') {
    throw new Error('Este pedido de compra já está cancelado.');
  }

  if (purchase.stockProcessed) {
    await reverseInventoryMoves(purchase);
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ status: 'cancelled', stockProcessed: false })
    .eq('id', purchase.id);

  if (error) {
    console.error('Erro ao cancelar compra:', error);
    throw error;
  }

  currentPurchases = currentPurchases.map((p) =>
    p.id === purchase.id ? { ...p, status: 'cancelled', stockProcessed: false } : p
  );
  notifyListeners();
};

export const deleteCancelledPurchase = async (purchase: Purchase): Promise<void> => {
  if (!purchase.id || purchase.status !== 'cancelled') {
    throw new Error('Somente pedidos de compra cancelados podem ser excluídos.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', purchase.id)
    .eq('status', 'cancelled')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('O pedido não está mais cancelado ou não foi encontrado. Atualize a lista e tente novamente.');

  currentPurchases = currentPurchases.filter((item) => item.id !== purchase.id);
  notifyListeners();
};

export const discardPurchaseDraft = async (purchase: Purchase): Promise<void> => {
  if (!purchase.id || purchase.status !== 'draft') {
    throw new Error('Somente pedidos em rascunho podem ser descartados.');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', purchase.id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Este pedido não está mais como rascunho. Atualize a lista e tente novamente.');

  currentPurchases = currentPurchases.filter((item) => item.id !== purchase.id);
  notifyListeners();
};

export const subscribeToPurchases = (callback: (purchases: Purchase[]) => void) => {
  listeners.push(callback);

  const fetchAll = () => {
    supabase
      .from(TABLE_NAME)
      .select('*, purchase_items(*)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then((response: any) => {
        const { data, error } = response;
        if (data && !error) {
          currentPurchases = assignPurchaseNumbers(data.reverse()); // Reverse back since we ordered DESC to get latest
          notifyListeners(false);
        } else if (error) {
          console.error('Erro ao buscar compras iniciais:', error);
          callback([]);
        }
      });
  };

  if (currentPurchases.length > 0) {
    callback([...currentPurchases]);
  }
  fetchAll();

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  const requestFetchAll = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchAll();
    }, 3000);
  };

  const channel = supabase
    .channel(`purchases_changes_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, requestFetchAll)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'purchase_items' },
      requestFetchAll
    )
    .subscribe();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    listeners = listeners.filter((l) => l !== callback);
    supabase.removeChannel(channel);
  };
};

export const savePurchase = async (purchase: Purchase): Promise<string | undefined> => {
  try {
    const dbPayload: any = {
      ...mapToDB(purchase),
    };
    if (purchase.purchaseNumber) {
      dbPayload.purchase_number = purchase.purchaseNumber;
    }
    delete dbPayload.items;

    const { data, error } = await supabase.from(TABLE_NAME).insert([dbPayload]).select();

    if (error) throw error;
    const savedRecord = data?.[0];
    if (savedRecord) {
      const purchaseId = String(savedRecord.id);
      if (purchase.items && purchase.items.length > 0) {
        await syncPurchaseItems(purchaseId, purchase.items);
      }
      const officialNumber =
        savedRecord.purchase_number !== undefined && savedRecord.purchase_number !== null
          ? Number(savedRecord.purchase_number)
          : currentPurchases.length + 1;
      const mapped = mapFromDB({ ...savedRecord, purchase_items: purchase.items }, officialNumber);
      currentPurchases = [mapped, ...currentPurchases];
      notifyListeners();
      return purchaseId;
    }
  } catch (error) {
    console.error('Erro ao salvar compra: ', error);
    throw error;
  }
};

export const updatePurchase = async (id: string, updates: Partial<Purchase>): Promise<void> => {
  try {
    const { data: existing, error: lookupError } = await supabase
      .from(TABLE_NAME)
      .select('*, purchase_items(*)')
      .eq('id', id)
      .single();
    if (lookupError) throw lookupError;
    if (!existing) throw new Error('Pedido não encontrado');
    if (updates.stockProcessed === true && ['cancelled', 'draft', 'pending'].includes(existing.status)) {
      throw new Error('Confirme o pedido como Em Ordem antes de registrar a entrada no estoque.');
    }

    const currentPurchase = mapFromDB(existing);
    const merged: Purchase = { ...currentPurchase, ...updates };

    const dbUpdates: any = {};
    if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId || null;
    if (updates.supplierName !== undefined) dbUpdates.supplier_name = updates.supplierName || null;
    if (updates.date !== undefined)
      dbUpdates.date = updates.date
        ? new Date(updates.date).toISOString()
        : new Date().toISOString();
    if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
    if (updates.observation !== undefined) dbUpdates.observation = updates.observation || '';
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.stockProcessed !== undefined) dbUpdates.stockProcessed = updates.stockProcessed;
    if (updates.invoiceNumber !== undefined)
      dbUpdates.invoice_number = updates.invoiceNumber || null;
    if (updates.invoiceDate !== undefined)
      dbUpdates.invoice_date =
        updates.invoiceDate && updates.invoiceDate.trim() !== ''
          ? new Date(updates.invoiceDate).toISOString()
          : null;
    if (updates.invoiceStatus !== undefined) dbUpdates.invoice_status = updates.invoiceStatus;
    if (updates.fiscalKey !== undefined) dbUpdates.fiscal_key = updates.fiscalKey || null;
    if (updates.attachments !== undefined) dbUpdates.attachments = updates.attachments || [];
    if (updates.discountPercent !== undefined)
      dbUpdates.discount_percent = updates.discountPercent || 0;
    if (updates.ipiPercent !== undefined) dbUpdates.ipi_value = updates.ipiPercent || 0;
    if (updates.freightPercent !== undefined)
      dbUpdates.freight_percent = updates.freightPercent || 0;

    if (updates.status === 'cancelled' && existing.stockProcessed) {
      await reverseInventoryMoves(id);
      dbUpdates.stockProcessed = false;
      merged.stockProcessed = false;
    }

    const update = supabase.from(TABLE_NAME).update(dbUpdates).eq('id', id);
    if (updates.stockProcessed === true) {
      const { data, error } = await update.or('status.neq.cancelled,status.is.null').select('id, stockProcessed');
      if (error) throw error;
      if (!Array.isArray(data) || data.length !== 1 || data[0]?.id !== id || data[0]?.stockProcessed !== true) {
        throw new Error('A conclusão da entrada não foi confirmada. Consulte o pedido antes de repetir.');
      }
    } else {
      const { error } = await update;
      if (error) throw error;
    }

    if (updates.items !== undefined) {
      await syncPurchaseItems(id, updates.items);
    }

    currentPurchases = currentPurchases.map((p) => (p.id === id ? merged : p));
    notifyListeners();
  } catch (error) {
    console.error('Erro ao atualizar compra: ', error);
    throw error;
  }
};

export const updatePurchaseDraft = async (id: string, updates: Partial<Purchase>): Promise<void> => {
  if (!id || updates.status !== 'draft') {
    throw new Error('A atualização automática só pode salvar um pedido como rascunho.');
  }

  const dbUpdates: Record<string, any> = {
    supplier_id: updates.supplierId || null,
    supplier_name: updates.supplierName || null,
    date: updates.date ? new Date(updates.date).toISOString() : new Date().toISOString(),
    total_value: Number(updates.totalValue || 0),
    observation: updates.observation || '',
    status: 'draft',
    invoice_number: updates.invoiceNumber || null,
    invoice_date:
      updates.invoiceDate && updates.invoiceDate.trim() !== ''
        ? new Date(updates.invoiceDate).toISOString()
        : null,
    invoice_status: updates.invoiceStatus || 'pending',
    attachments: updates.attachments || [],
    discount_percent: Number(updates.discountPercent || 0),
    ipi_value: Number(updates.ipiPercent || 0),
    freight_percent: Number(updates.freightPercent || 0),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(dbUpdates)
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Este pedido não está mais como rascunho. Reabra a lista antes de continuar.');

  if (updates.items !== undefined) await syncPurchaseItems(id, updates.items);
  currentPurchases = currentPurchases.map((purchase) =>
    purchase.id === id
      ? { ...purchase, ...updates, items: updates.items ?? purchase.items }
      : purchase
  );
  notifyListeners();
};

const mapToDB = (p: Purchase) => ({
  supplier_id: p.supplierId || null,
  supplier_name: p.supplierName || null,
  date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
  total_value: p.totalValue || 0,
  observation: p.observation || '',
  status: p.status || 'ordered',
  invoice_number: p.invoiceNumber || null,
  invoice_date:
    p.invoiceDate && p.invoiceDate.trim() !== '' ? new Date(p.invoiceDate).toISOString() : null,
  invoice_status: p.invoiceStatus || 'pending',
  fiscal_key: p.fiscalKey || null,
  attachments: p.attachments || [],
  discount_percent: Number(p.discountPercent || 0),
  ipi_value: p.ipiPercent || 0,
  freight_percent: p.freightPercent || 0,
  created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
});

const mapFromDB = (data: any, sequentialIndex?: number): Purchase => {
  const items: any[] =
    Array.isArray(data.purchase_items) && data.purchase_items.length > 0
      ? data.purchase_items
          .sort((a: any, b: any) => (a.item_index || 0) - (b.item_index || 0))
          .map((pi: any) => ({
            productId: pi.product_id || pi.item_snapshot?.productId || '',
            variationId: pi.variation_id || pi.item_snapshot?.variationId || undefined,
            description: pi.description || pi.item_snapshot?.description || '',
            quantity: Number(pi.quantity || 1),
            receivedQuantity:
              pi.item_snapshot?.receivedQuantity !== undefined
                ? Number(pi.item_snapshot.receivedQuantity)
                : undefined,
            baseCost: Number(pi.base_cost ?? pi.item_snapshot?.baseCost ?? 0),
            discountUnit: Number(pi.item_snapshot?.discountUnit ?? pi.discountUnit ?? 0),
            unitCost: Number(pi.unit_cost ?? pi.item_snapshot?.unitCost ?? 0),
            totalCost: Number(pi.total_cost ?? pi.item_snapshot?.totalCost ?? 0),
          }))
      : Array.isArray(data.items)
        ? data.items
        : [];

  return {
    id: String(data.id),
    purchaseNumber: data.purchase_number
      ? Number(data.purchase_number)
      : sequentialIndex !== undefined
        ? sequentialIndex
        : undefined,
    supplierId: data.supplier_id,
    supplierName: data.supplier_name,
    date: data.date,
    items,
    totalValue: Number(data.total_value),
    observation: data.observation,
    status: data.status === 'opened' || !data.status ? 'ordered' : data.status,
    invoiceNumber: data.invoice_number,
    invoiceDate: data.invoice_date,
    invoiceStatus: data.invoice_status,
    fiscalKey: data.fiscal_key,
    attachments: data.attachments || [],
    discountPercent: Number(data.discount_percent || 0),
    ipiPercent: data.ipi_value ? Number(data.ipi_value) : 0,
    freightPercent: data.freight_percent ? Number(data.freight_percent) : 0,
    createdAt: data.created_at,
    stockProcessed: !!data.stockProcessed,
  };
};

export { mapFromDB as mapPurchaseFromDB };
