import { supabase } from '../supabaseConfig';
import { resolveOrderFiscalBadgePair } from './orderFiscalBadgeRules';
import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatuses,
} from './orderFiscalBadgeRules';

interface FiscalBadgeSupplement {
  documents?: FiscalDocumentStatusRow[];
  cancellationEvents?: Array<{ document_id: string; status: string; requested_at?: string }>;
  estornoDrafts?: Array<{
    original_document_id: string;
    operation_kind: 'estorno' | 'return';
    environment: number;
    status: string;
    created_at?: string;
  }>;
  cancelledOrderIds?: string[];
}

export const fetchOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[]
): Promise<Record<string, OrderFiscalBadgeStatuses>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  let supplement: FiscalBadgeSupplement = {};
  let documentRows: FiscalDocumentStatusRow[] | null = null;
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (accessToken) {
    try {
      const response = await fetch('/api/nfe/order-fiscal-badges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ orderIds: uniqueOrderIds }),
      });
      if (response.ok) {
        supplement = (await response.json()) as FiscalBadgeSupplement;
        if (Array.isArray(supplement.documents)) documentRows = supplement.documents;
      }
    } catch {
      // Fall back to the authenticated browser query below.
    }
  }

  if (!documentRows) {
    const { data, error } = await supabase
      .from('nfe_documents')
      .select('id,order_id,status,document_type,ambiente,created_at')
      .in('order_id', uniqueOrderIds);

    if (error) throw error;
    documentRows = (data || []) as FiscalDocumentStatusRow[];
  }

  if (!Array.isArray(supplement.cancelledOrderIds)) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id,status')
      .in('id', uniqueOrderIds);
    if (error) throw error;
    supplement = {
      ...supplement,
      cancelledOrderIds: (orders || [])
        .filter((order) => ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase()))
        .map((order) => String(order.id)),
    };
  }

  const cancellationStatusByDocumentId = new Map<string, { status: string; requestedAt?: string }>();
  for (const event of supplement.cancellationEvents || []) {
    if (event.document_id)
      cancellationStatusByDocumentId.set(event.document_id, {
        status: event.status,
        requestedAt: event.requested_at,
      });
  }

  const documentsByOrderId = new Map<string, FiscalDocumentStatusRow[]>();
  const orderIdByDocumentId = new Map<string, string>();
  for (const row of documentRows) {
    if (!row.order_id) continue;
    if (row.id) orderIdByDocumentId.set(row.id, row.order_id);
    const documents = documentsByOrderId.get(row.order_id) || [];
    const cancellationEvent = row.id ? cancellationStatusByDocumentId.get(row.id) : undefined;
    documents.push({
      ...row,
      cancellationEventStatus: cancellationEvent?.status,
      cancellationEventRequestedAt: cancellationEvent?.requestedAt,
    });
    documentsByOrderId.set(row.order_id, documents);
  }

  const draftsByOrderId = new Map<string, FiscalOperationDraftStatusRow[]>();
  for (const draft of supplement.estornoDrafts || []) {
    const orderId = orderIdByDocumentId.get(draft.original_document_id);
    if (!orderId) continue;
    const drafts = draftsByOrderId.get(orderId) || [];
    drafts.push({
      original_document_id: draft.original_document_id,
      operation_kind: draft.operation_kind,
      environment: draft.environment,
      status: draft.status,
      created_at: draft.created_at,
    });
    draftsByOrderId.set(orderId, drafts);
  }

  return Object.fromEntries(
    uniqueOrderIds.map((orderId) => [
      orderId,
      resolveOrderFiscalBadgePair(
        documentsByOrderId.get(orderId) || [],
        draftsByOrderId.get(orderId) || [],
        supplement.cancelledOrderIds?.includes(orderId) || false
      ),
    ])
  );
};
