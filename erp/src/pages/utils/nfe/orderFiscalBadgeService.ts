import { supabase } from '../supabaseConfig';
import { resolveOrderFiscalBadgePair } from './orderFiscalBadgeRules';
import type { FiscalDocumentStatusRow, OrderFiscalBadgeStatuses } from './orderFiscalBadgeRules';

export const fetchOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[]
): Promise<Record<string, OrderFiscalBadgeStatuses>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('nfe_documents')
    .select('id,order_id,status,document_type,ambiente,created_at')
    .in('order_id', uniqueOrderIds);

  if (error) throw error;

  const documentsByOrderId = new Map<string, FiscalDocumentStatusRow[]>();
  for (const row of (data || []) as FiscalDocumentStatusRow[]) {
    if (!row.order_id) continue;
    const documents = documentsByOrderId.get(row.order_id) || [];
    documents.push(row);
    documentsByOrderId.set(row.order_id, documents);
  }

  return Object.fromEntries(
    uniqueOrderIds.map((orderId) => [
      orderId,
      resolveOrderFiscalBadgePair(documentsByOrderId.get(orderId) || []),
    ])
  );
};
