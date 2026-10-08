export type OrderFiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'failed' | 'rejected';
export type OrderFiscalOperationBadgeStatus =
  | 'issued'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'prepared'
  | 'pending';

export type OrderFiscalCancellationState = 'failed' | 'pending' | 'verify';

export interface FiscalDocumentStatusRow {
  id?: string;
  created_at?: string;
  order_id: string | null;
  status: string;
  document_type?: string | null;
  ambiente?: number | null;
  cancellationEventStatus?: string | null;
  cancellationEventRequestedAt?: string | null;
}

export interface FiscalOperationDraftStatusRow {
  original_document_id: string;
  operation_kind: 'estorno' | 'return';
  environment?: number | null;
  status: string;
  created_at?: string | null;
}

export interface OrderFiscalBadgeStatuses {
  production: OrderFiscalBadgeStatus;
  homologation?: OrderFiscalBadgeStatus;
  productionDocumentId?: string;
  homologationDocumentId?: string;
  cancellationState?: OrderFiscalCancellationState;
  estornoStatus?: OrderFiscalOperationBadgeStatus;
  estornoDocumentId?: string;
  estornoEnvironment?: 1 | 2;
  devolucaoStatus?: OrderFiscalOperationBadgeStatus;
  devolucaoDocumentId?: string;
  devolucaoEnvironment?: 1 | 2;
}

const FISCAL_REJECTION_STATUSES = new Set(['rejeitada', 'denegada']);

const newestFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow) =>
  String(b.created_at || '').localeCompare(String(a.created_at || ''));

const productionFirst = (a: FiscalDocumentStatusRow, b: FiscalDocumentStatusRow) =>
  Number(a.ambiente === 2) - Number(b.ambiente === 2) || newestFirst(a, b);

const resolveFiscalOperationBadge = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[],
  documentType: 'estorno' | 'return'
): { status?: OrderFiscalOperationBadgeStatus; documentId?: string; environment?: 1 | 2 } => {
  const operationDocuments = documents.filter((document) => document.document_type === documentType);
  const authorizedDocument = operationDocuments
    .filter(isAuthorizedFiscalDocument)
    .sort(productionFirst)[0];
  const cancelledDocument = operationDocuments
    .filter((document) => document.status.toLowerCase() === 'cancelada')
    .sort(productionFirst)[0];
  const rejectedDocument = operationDocuments
    .filter((document) => FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase()))
    .sort(productionFirst)[0];
  const failedDocument = operationDocuments
    .filter((document) => document.status.toLowerCase() === 'erro')
    .sort(productionFirst)[0];
  const latestDraft = drafts
    .filter((draft) => draft.operation_kind === documentType)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];

  if (authorizedDocument) {
    return {
      status: 'issued',
      documentId: authorizedDocument.id,
      environment: authorizedDocument.ambiente === 2 ? 2 : 1,
    };
  }

  if (cancelledDocument) {
    return {
      status: 'cancelled',
      documentId: cancelledDocument.id,
      environment: cancelledDocument.ambiente === 2 ? 2 : 1,
    };
  }

  if (latestDraft) {
    const draftStatus = latestDraft.status.toLowerCase();
    if (draftStatus === 'rejected') {
      return { status: 'rejected', environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'transmitting' || draftStatus === 'unknown') {
      return { status: 'pending', environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'draft' || draftStatus === 'ready') {
      return { status: 'prepared', environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'authorized') {
      return { status: 'issued', environment: latestDraft.environment === 2 ? 2 : 1 };
    }
  }

  if (rejectedDocument) {
    return {
      status: 'rejected',
      documentId: rejectedDocument.id,
      environment: rejectedDocument.ambiente === 2 ? 2 : 1,
    };
  }

  if (!failedDocument) return {};

  return {
    status: 'failed',
    documentId: failedDocument.id,
    environment: failedDocument.ambiente === 2 ? 2 : 1,
  };
};

export const resolveOrderFiscalEstornoBadge = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[] = []
): Pick<OrderFiscalBadgeStatuses, 'estornoStatus' | 'estornoDocumentId' | 'estornoEnvironment'> => {
  const badge = resolveFiscalOperationBadge(documents, drafts, 'estorno');
  if (!badge.status) return {};
  return {
    estornoStatus: badge.status,
    estornoDocumentId: badge.documentId,
    estornoEnvironment: badge.environment,
  };
};

export const resolveOrderFiscalDevolucaoBadge = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[] = []
): Pick<
  OrderFiscalBadgeStatuses,
  'devolucaoStatus' | 'devolucaoDocumentId' | 'devolucaoEnvironment'
> => {
  const badge = resolveFiscalOperationBadge(documents, drafts, 'return');
  if (!badge.status) return {};
  return {
    devolucaoStatus: badge.status,
    devolucaoDocumentId: badge.documentId,
    devolucaoEnvironment: badge.environment,
  };
};

export const isAuthorizedFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

export const isOutboundFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';

const isAuthorized = isAuthorizedFiscalDocument;
const isOutbound = isOutboundFiscalDocument;

export const resolveOrderFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[]
): OrderFiscalBadgeStatus => {
  const outboundDocuments = documents.filter(isOutbound);

  if (
    outboundDocuments.some(
      (document) =>
        isAuthorized(document) &&
        String(document.cancellationEventStatus || '').toLowerCase() !== 'registered'
    )
  ) {
    return 'issued';
  }

  if (
    outboundDocuments.some(
      (document) => String(document.cancellationEventStatus || '').toLowerCase() === 'registered'
    )
  ) {
    return 'cancelled';
  }

  if (
    outboundDocuments.some((document) =>
      FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase())
    )
  ) {
    return 'rejected';
  }

  if (outboundDocuments.some((document) => document.status.toLowerCase() === 'erro')) {
    return 'failed';
  }

  if (outboundDocuments.some((document) => document.status === 'cancelada')) {
    return 'cancelled';
  }

  return 'not_issued';
};

export const resolveOrderFiscalBadgePair = (
  documents: readonly FiscalDocumentStatusRow[],
  operationDrafts: readonly FiscalOperationDraftStatusRow[] = [],
  orderCancelled = false,
  now = Date.now()
): OrderFiscalBadgeStatuses => {
  // Estornos and devoluções have their own badges and cannot replace NF/NFH status.
  const outboundDocs = documents.filter(isOutbound);
  const prodDocs = outboundDocs.filter((doc) => doc.ambiente !== 2);
  const hmlDocs = outboundDocs.filter((doc) => doc.ambiente === 2);

  const production = resolveOrderFiscalBadgeStatus(prodDocs);
  const homologation = resolveOrderFiscalBadgeStatus(hmlDocs);
  const latestCancellationEvent = outboundDocs
    .filter((document) => document.cancellationEventStatus)
    .sort((a, b) =>
      String(b.cancellationEventRequestedAt || b.created_at || '').localeCompare(
        String(a.cancellationEventRequestedAt || a.created_at || '')
      )
    )[0];
  const cancellationEventState = String(latestCancellationEvent?.cancellationEventStatus || '')
    .toLowerCase();
  const cancellationState: OrderFiscalCancellationState | undefined =
    cancellationEventState === 'rejected'
      ? 'failed'
      : cancellationEventState === 'unknown'
        ? 'verify'
        : cancellationEventState === 'transmitting'
          ? (() => {
              const requestedAt = new Date(
                latestCancellationEvent?.cancellationEventRequestedAt || ''
              ).getTime();
              return Number.isFinite(requestedAt) && now - requestedAt < 30_000
                ? 'pending'
                : 'verify';
            })()
          : !cancellationEventState &&
              orderCancelled &&
              outboundDocs.some(isAuthorized) &&
              !operationDrafts.some((draft) => draft.operation_kind === 'estorno')
            ? 'pending'
            : undefined;
  const findDocumentId = (
    environmentDocuments: readonly FiscalDocumentStatusRow[],
    status: OrderFiscalBadgeStatus
  ) => {
    const matchingDocuments = environmentDocuments.filter((document) => {
      if (status === 'failed') return document.status.toLowerCase() === 'erro';
      if (status === 'rejected')
        return FISCAL_REJECTION_STATUSES.has(document.status.toLowerCase());
      if (status === 'cancelled')
        return (
          (isOutbound(document) && document.status === 'cancelada') ||
          String(document.cancellationEventStatus || '').toLowerCase() === 'registered'
        );
      if (status === 'issued')
        return (
          isOutbound(document) &&
          isAuthorized(document) &&
          String(document.cancellationEventStatus || '').toLowerCase() !== 'registered'
        );
      return false;
    });
    return matchingDocuments.sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    )[0]?.id;
  };

  return {
    production,
    homologation,
    productionDocumentId: findDocumentId(prodDocs, production),
    homologationDocumentId:
      homologation !== 'not_issued' ? findDocumentId(hmlDocs, homologation) : undefined,
    ...(cancellationState ? { cancellationState } : {}),
    ...resolveOrderFiscalEstornoBadge(documents, operationDrafts),
    ...resolveOrderFiscalDevolucaoBadge(documents, operationDrafts),
  };
};
