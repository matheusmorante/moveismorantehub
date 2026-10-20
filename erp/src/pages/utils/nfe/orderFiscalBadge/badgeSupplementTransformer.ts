import {
  resolveOrderFiscalBadgePair,
  resolveReturnFiscalBadgeStatus,
} from '../orderFiscalBadgeRules';
import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatuses,
  ReturnFiscalDocumentSummary,
} from '../orderFiscalBadgeRules';
import type {
  BadgeDocumentRow,
  FiscalBadgeSupplement,
} from './orderFiscalBadge.types';

export function assembleOrderFiscalBadgeStatuses(
  uniqueOrderIds: readonly string[],
  documentRows: BadgeDocumentRow[],
  supplement: FiscalBadgeSupplement
): Record<string, OrderFiscalBadgeStatuses> {
  const cancellationStatusByDocumentId = new Map<
    string,
    { status: string; requestedAt?: string }
  >();
  for (const event of supplement.cancellationEvents || []) {
    if (event.document_id) {
      cancellationStatusByDocumentId.set(event.document_id, {
        status: event.status,
        requestedAt: event.requested_at,
      });
    }
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
      id: draft.id,
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
      const nfdDocuments = [
        ...new Map(returnDocuments.map((document) => [document.id, document])).values(),
      ];
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
            nfdDocuments.length === 1 ? (nfdDocuments[0].ambiente === 2 ? 2 : 1) : undefined,
        } satisfies OrderFiscalBadgeStatuses,
      ];
    })
  );
}
