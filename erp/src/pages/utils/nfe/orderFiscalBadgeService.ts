import { supabase } from '../supabaseConfig';
import { resolveOrderFiscalBadgeStatus } from './orderFiscalBadgeRules';
import type {
  FiscalDocumentStatusRow,
  OrderFiscalBadgeStatus,
} from './orderFiscalBadgeRules';

export const fetchOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[]
): Promise<Record<string, OrderFiscalBadgeStatus>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  const { data, error } = await supabase
    .from('nfe_documents')
    .select('order_id,status,document_type')
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
      resolveOrderFiscalBadgeStatus(documentsByOrderId.get(orderId) || []),
    ])
  );
};
