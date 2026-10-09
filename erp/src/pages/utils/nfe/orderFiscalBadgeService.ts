import { supabase } from '../supabaseConfig';
import { getAuthorizedAt } from './nfeEventRules';
import {
  resolveOrderFiscalBadgePair,
  resolveReturnFiscalBadgeStatus,
} from './orderFiscalBadgeRules';
import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatuses,
  ReturnFiscalDocumentSummary,
} from './orderFiscalBadgeRules';

interface BadgeDocumentRow extends FiscalDocumentStatusRow {
  id?: string;
  numero_nfe?: string | number | null;
  serie?: string | number | null;
  modelo?: string | null;
  valor_total?: number | string | null;
  issuedAt?: string | null;
  returnOrderCode?: string | number | null;
  itemQuantity?: number | null;
}

interface FiscalBadgeSupplement {
  documents?: BadgeDocumentRow[];
  returnOrders?: RelatedOrderRow[];
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

interface RelatedOrderRow {
  id: string;
  status?: string | null;
  order_type?: string | null;
  linked_order_id?: string | null;
  legacy_parent_id?: string | null;
  order_index?: string | number | null;
}

const DOCUMENT_SELECT =
  'id,order_id,status,document_type,ambiente,created_at,numero_nfe,serie,modelo,valor_total';

const loadScopedBadgeSupplement = async (
  orderIds: readonly string[],
  includeRelatedReturns: boolean
): Promise<{ supplement: FiscalBadgeSupplement; documents: BadgeDocumentRow[] }> => {
  const { data: visibleOrders, error: visibleOrdersError } = await supabase
    .from('orders')
    .select('id,status')
    .in('id', [...orderIds]);
  if (visibleOrdersError) throw visibleOrdersError;

  const relatedReturns: RelatedOrderRow[] = [];
  if (includeRelatedReturns) {
    const [linkedResult, legacyResult] = await Promise.all([
      supabase
        .from('orders')
        .select('id,status,order_type,linked_order_id,order_index,legacy_parent_id:order_data->>linkedOrderId')
        .eq('order_type', 'return')
        .in('linked_order_id', [...orderIds]),
      supabase
        .from('orders')
        .select('id,status,order_type,linked_order_id,order_index,legacy_parent_id:order_data->>linkedOrderId')
        .eq('order_type', 'return')
        .in('order_data->>linkedOrderId', [...orderIds]),
    ]);
    if (linkedResult.error) throw linkedResult.error;
    if (legacyResult.error) throw legacyResult.error;
    const uniqueReturns = new Map<string, RelatedOrderRow>();
    for (const row of [...(linkedResult.data || []), ...(legacyResult.data || [])]) {
      uniqueReturns.set(String(row.id), row as RelatedOrderRow);
    }
    relatedReturns.push(...uniqueReturns.values());
  }

  const scopedOrderIds = [
    ...new Set([...orderIds, ...relatedReturns.map((row) => String(row.id))]),
  ];
  const { data: rows, error: documentsError } = await supabase
    .from('nfe_documents')
    .select(DOCUMENT_SELECT)
    .in('order_id', scopedOrderIds);
  if (documentsError) throw documentsError;

  const returnDocumentIds = [...
    new Set(
      (rows || [])
        .filter((row) => row.document_type === 'return' && row.id)
        .map((row) => String(row.id))
    ),
  ];
  let itemQuantityByDocumentId = new Map<string, number>();
  let authorizationXmlByDocumentId = new Map<string, string>();
  if (returnDocumentIds.length) {
    const [itemsResult, protocolResult] = await Promise.all([
      supabase
        .from('nfe_document_items')
        .select('document_id,billed_quantity')
        .in('document_id', returnDocumentIds),
      supabase.from('nfe_documents').select('id,xml_protocolo').in('id', returnDocumentIds),
    ]);
    const { data: items, error: itemsError } = itemsResult;
    const { data: protocols, error: protocolError } = protocolResult;
    if (!itemsError) {
      itemQuantityByDocumentId = new Map<string, number>();
      for (const item of items || []) {
        const documentId = String(item.document_id || '');
        if (!documentId) continue;
        itemQuantityByDocumentId.set(
          documentId,
          (itemQuantityByDocumentId.get(documentId) || 0) + Number(item.billed_quantity || 0)
        );
      }
    }
    if (!protocolError) {
      authorizationXmlByDocumentId = new Map(
        (protocols || []).map((document) => [String(document.id), String(document.xml_protocolo || '')])
      );
    }
  }

  const returnOrderById = new Map(relatedReturns.map((row) => [String(row.id), row]));
  const documents = (rows || []).map((row) => {
    const returnOrder = returnOrderById.get(String(row.order_id || ''));
    const isReturnDocument = row.document_type === 'return';
    const document: BadgeDocumentRow = {
      ...row,
      issuedAt:
        isReturnDocument && row.id
          ? getAuthorizedAt(authorizationXmlByDocumentId.get(String(row.id)) || '', '') || null
          : null,
      ...(isReturnDocument && returnOrder
        ? { returnOrderCode: returnOrder.order_index || returnOrder.id }
        : {}),
      ...(isReturnDocument && row.id
        ? { itemQuantity: itemQuantityByDocumentId.get(String(row.id)) }
        : {}),
    };
    return document;
  });

  const cancelledOrderIds = (visibleOrders || [])
    .filter((order) => ['cancelled', 'cancelado'].includes(String(order.status || '').toLowerCase()))
    .map((order) => String(order.id));
  return {
    supplement: {
      documents,
      returnOrders: relatedReturns,
      cancelledOrderIds,
    },
    documents,
  };
};

export const fetchOrderFiscalBadgeStatuses = async (
  orderIds: readonly string[]
): Promise<Record<string, OrderFiscalBadgeStatuses>> => {
  const uniqueOrderIds = [...new Set(orderIds.filter(Boolean))];
  if (uniqueOrderIds.length === 0) return {};

  let supplement: FiscalBadgeSupplement = {};
  let documentRows: BadgeDocumentRow[] | null = null;
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
      // Fall back to the same bounded, RLS-protected queries in the browser.
    }
  }

  if (!documentRows) {
    const direct = await loadScopedBadgeSupplement(uniqueOrderIds, true);
    supplement = { ...supplement, ...direct.supplement };
    documentRows = direct.documents;
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

  const returnOrderIdsBySaleId = new Map<string, Set<string>>();
  for (const returnOrder of supplement.returnOrders || []) {
    const saleId = returnOrder.linked_order_id || returnOrder.legacy_parent_id;
    if (!saleId) continue;
    const ids = returnOrderIdsBySaleId.get(String(saleId)) || new Set<string>();
    ids.add(String(returnOrder.id));
    returnOrderIdsBySaleId.set(String(saleId), ids);
  }

  return Object.fromEntries(
    uniqueOrderIds.map((orderId) => {
      const relatedReturnIds = returnOrderIdsBySaleId.get(orderId) || new Set<string>();
      const returnDocuments = (documentRows || [])
        .filter(
          (document): document is ReturnFiscalDocumentSummary =>
            Boolean(document.id) &&
            document.document_type === 'return' &&
            document.order_id !== null &&
            (document.order_id === orderId || relatedReturnIds.has(document.order_id))
        )
        .map((document) => ({
          ...document,
          id: String(document.id),
          order_id: String(document.order_id),
        }));
      const nfdDocuments = [...new Map(returnDocuments.map((document) => [document.id, document])).values()];
      const devolucaoStatus = resolveReturnFiscalBadgeStatus(nfdDocuments);
      const base = resolveOrderFiscalBadgePair(
        documentsByOrderId.get(orderId) || [],
        draftsByOrderId.get(orderId) || [],
        supplement.cancelledOrderIds?.includes(orderId) || false
      );
      return [
        orderId,
        {
          ...base,
          devolucaoStatus,
          devolucaoCount: nfdDocuments.length,
          devolucaoDocuments: nfdDocuments,
          devolucaoDocumentId: nfdDocuments.length === 1 ? nfdDocuments[0].id : undefined,
          devolucaoEnvironment:
            nfdDocuments.length === 1
              ? nfdDocuments[0].ambiente === 2
                ? 2
                : 1
              : undefined,
        } satisfies OrderFiscalBadgeStatuses,
      ];
    })
  );
};
