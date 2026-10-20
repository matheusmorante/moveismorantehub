export type OrderFiscalBadgeStatus = 'not_issued' | 'issued' | 'cancelled' | 'failed' | 'rejected';
export type OrderFiscalOperationBadgeStatus =
  | 'issued'
  | 'failed'
  | 'rejected'
  | 'cancelled'
  | 'prepared'
  | 'pending'
  | 'mixed'
  | 'uncertain';

export type ReturnFiscalBadgeStatus = Extract<
  OrderFiscalOperationBadgeStatus,
  'issued' | 'failed' | 'rejected' | 'cancelled' | 'pending' | 'mixed' | 'uncertain'
>;

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

export interface ReturnFiscalDocumentSummary extends FiscalDocumentStatusRow {
  id: string;
  order_id: string;
  numero_nfe?: string | number | null;
  serie?: string | number | null;
  modelo?: string | null;
  valor_total?: number | string | null;
  issuedAt?: string | null;
  returnOrderCode?: string | number | null;
  itemQuantity?: number | null;
}

export interface FiscalOperationDraftStatusRow {
  id?: string;
  original_document_id: string;
  operation_kind: 'estorno' | 'return';
  environment?: number | null;
  status: string;
  created_at?: string | null;
}

export interface OutboundFiscalBadgeItem {
  id?: string;
  status: OrderFiscalBadgeStatus;
  sequenceNumber: number;
  label: string;
}

export interface OrderFiscalBadgeStatuses {
  production: OrderFiscalBadgeStatus;
  homologation?: OrderFiscalBadgeStatus;
  productionDocumentId?: string;
  homologationDocumentId?: string;
  productionBadges?: OutboundFiscalBadgeItem[];
  homologationBadges?: OutboundFiscalBadgeItem[];
  cancellationState?: OrderFiscalCancellationState;
  cancellationDocuments?: Array<{
    documentId: string;
    environment: 1 | 2;
    state: OrderFiscalCancellationState;
  }>;
  estornoStatus?: OrderFiscalOperationBadgeStatus;
  estornoDocumentId?: string;
  estornoDraftId?: string;
  estornoEnvironment?: 1 | 2;
  devolucaoStatus?: OrderFiscalOperationBadgeStatus;
  devolucaoDocumentId?: string;
  devolucaoEnvironment?: 1 | 2;
  devolucaoCount?: number;
  devolucaoDocuments?: ReturnFiscalDocumentSummary[];
  /** True when estorno was confirmed and no replacement HML outbound has been emitted. */
  readyToReissueHml?: boolean;
  /** True when estorno was confirmed and no replacement prod outbound has been emitted. */
  readyToReissueProd?: boolean;
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
): {
  status?: OrderFiscalOperationBadgeStatus;
  documentId?: string;
  draftId?: string;
  environment?: 1 | 2;
} => {
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
    const draftId = latestDraft.id;
    if (draftStatus === 'rejected') {
      return { status: 'rejected', draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'transmitting' || draftStatus === 'unknown') {
      return { status: 'pending', draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'draft' || draftStatus === 'ready') {
      return { status: 'prepared', draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
    }
    if (draftStatus === 'authorized') {
      return { status: 'issued', draftId, environment: latestDraft.environment === 2 ? 2 : 1 };
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
): Pick<
  OrderFiscalBadgeStatuses,
  'estornoStatus' | 'estornoDocumentId' | 'estornoDraftId' | 'estornoEnvironment'
> => {
  const badge = resolveFiscalOperationBadge(documents, drafts, 'estorno');
  if (!badge.status) return {};
  return {
    estornoStatus: badge.status,
    estornoDocumentId: badge.documentId,
    estornoDraftId: badge.draftId,
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

const RETURN_DOCUMENT_STATE: Record<string, ReturnFiscalBadgeStatus> = {
  autorizada: 'issued',
  homologada: 'issued',
  cancelada: 'cancelled',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  rejeitada: 'rejected',
  rejeitado: 'rejected',
  denegada: 'rejected',
  rejected: 'rejected',
  pendente: 'pending',
  processando: 'pending',
  transmitting: 'pending',
  pending: 'pending',
  erro: 'failed',
  error: 'failed',
};

const returnDocumentState = (document: ReturnFiscalDocumentSummary): ReturnFiscalBadgeStatus => {
  const documentState =
    RETURN_DOCUMENT_STATE[String(document.status || '').toLowerCase()] || 'uncertain';
  if (documentState === 'cancelled') return documentState;

  const cancellationState = String(document.cancellationEventStatus || '').toLowerCase();
  if (cancellationState === 'transmitting') return 'pending';
  if (cancellationState === 'unknown' || cancellationState === 'registered') return 'uncertain';
  return documentState;
};

/** Derives the NFD state only from distinct persisted return documents. */
export const resolveReturnFiscalBadgeStatus = (
  documents: readonly ReturnFiscalDocumentSummary[]
): ReturnFiscalBadgeStatus | undefined => {
  const uniqueDocuments = new Map<string, ReturnFiscalDocumentSummary>();
  for (const document of documents) {
    if (document.id && document.document_type === 'return') uniqueDocuments.set(document.id, document);
  }
  const states = [...uniqueDocuments.values()].map(returnDocumentState);
  if (!states.length) return undefined;
  if (states.includes('failed')) return 'failed';
  if (states.includes('uncertain')) return 'uncertain';
  const uniqueStates = new Set(states);
  if (uniqueStates.size > 1) return 'mixed';
  return states[0];
};

export const isAuthorizedFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  document.status === 'autorizada' || document.status === 'homologada';

export const isOutboundFiscalDocument = (document: FiscalDocumentStatusRow): boolean =>
  (document.document_type || 'outbound') === 'outbound';

const isAuthorized = isAuthorizedFiscalDocument;
const isOutbound = isOutboundFiscalDocument;

/** Returns the set of outbound document IDs whose estorno has been confirmed (authorized). */
const getEstornoConfirmedDocumentIds = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[]
): Set<string> => {
  const confirmed = new Set<string>();
  // A draft with status='authorized' confirms the estorno for its original_document_id.
  for (const draft of drafts) {
    if (draft.operation_kind === 'estorno' &&
        draft.status === 'authorized' &&
        draft.original_document_id) {
      confirmed.add(draft.original_document_id);
    }
  }
  // A persisted estorno document (document_type='estorno') also confirms it.
  const estornoDocs = documents.filter((d) => d.document_type === 'estorno' && isAuthorized(d));
  // We don't have original_document_id in FiscalDocumentStatusRow, so rely on drafts above.
  // (The badge service always returns drafts alongside documents, so this is sufficient.)
  return confirmed;
};

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

  // Compute which original document IDs have a confirmed estorno (authorized draft).
  const estornoConfirmedIds = getEstornoConfirmedDocumentIds(documents, operationDrafts);

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
  const cancellationDocuments = outboundDocs
    .filter((document) => Boolean(document.id) && isAuthorized(document))
    .flatMap((document) => {
      const state = String(document.cancellationEventStatus || '').toLowerCase();
      const cancellationStatus: OrderFiscalCancellationState | undefined =
        state === 'rejected'
          ? 'failed'
          : state === 'unknown' || state === 'registered'
            ? 'verify'
            : state === 'transmitting'
              ? (() => {
                  const requestedAt = new Date(document.cancellationEventRequestedAt || '').getTime();
                  return Number.isFinite(requestedAt) && now - requestedAt < 30_000 ? 'pending' : 'verify';
                })()
              : orderCancelled &&
                  !operationDrafts.some(
                    (draft) => draft.operation_kind === 'estorno' && draft.original_document_id === document.id
                  )
                ? 'pending'
                : undefined;
      return cancellationStatus
        ? [{ documentId: document.id!, environment: document.ambiente === 2 ? 2 as const : 1 as const, state: cancellationStatus }]
        : [];
    });
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

  // readyToReissue: estorno confirmed, but no replacement outbound doc emitted yet.
  const replacementOutboundDocs = documents.filter(
    (d) => isOutbound(d) && isAuthorized(d) && !estornoConfirmedIds.has(d.id || '')
  );
  const hasReplacementHml = replacementOutboundDocs.some((d) => d.ambiente === 2);
  const hasReplacementProd = replacementOutboundDocs.some((d) => d.ambiente !== 2);
  const hasConfirmedEstornoHml = hmlDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));
  const hasConfirmedEstornoProd = prodDocs.some((d) => d.id && estornoConfirmedIds.has(d.id));

  const hmlOutboundDocs = outboundDocs
    .filter((d) => d.ambiente === 2)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  const homologationBadges: OutboundFiscalBadgeItem[] = hmlOutboundDocs.map((doc, index) => {
    const seq = index + 1;
    const label = seq === 1 ? 'NFH' : `NFH ${seq}`;
    return {
      id: doc.id,
      status: resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label,
    };
  });

  if (hasConfirmedEstornoHml && !hasReplacementHml) {
    homologationBadges.push({
      status: 'not_issued',
      sequenceNumber: hmlOutboundDocs.length + 1,
      label: `NFH ${hmlOutboundDocs.length + 1}`,
    });
  }

  const prodOutboundDocs = outboundDocs
    .filter((d) => d.ambiente !== 2)
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

  const productionBadges: OutboundFiscalBadgeItem[] = prodOutboundDocs.map((doc, index) => {
    const seq = index + 1;
    const label = seq === 1 ? 'NF' : `NF ${seq}`;
    return {
      id: doc.id,
      status: resolveOrderFiscalBadgeStatus([doc]),
      sequenceNumber: seq,
      label,
    };
  });

  if (prodOutboundDocs.length === 0) {
    productionBadges.push({
      status: production,
      sequenceNumber: 1,
      label: 'NF',
    });
  } else if (hasConfirmedEstornoProd && !hasReplacementProd) {
    productionBadges.push({
      status: 'not_issued',
      sequenceNumber: prodOutboundDocs.length + 1,
      label: `NF ${prodOutboundDocs.length + 1}`,
    });
  }

  const prodDocId = findDocumentId(prodDocs, production);
  const hmlDocId = findDocumentId(hmlDocs, homologation);

  return {
    production,
    homologation,
    ...(production !== 'not_issued' && prodDocId ? { productionDocumentId: prodDocId } : {}),
    ...(homologation !== 'not_issued' && hmlDocId ? { homologationDocumentId: hmlDocId } : {}),
    ...(productionBadges.some((b) => b.status !== 'not_issued' || b.sequenceNumber > 1)
      ? { productionBadges }
      : {}),
    ...(homologationBadges.length > 0 ? { homologationBadges } : {}),
    ...(cancellationState ? { cancellationState } : {}),
    ...(cancellationDocuments.length ? { cancellationDocuments } : {}),
    ...resolveOrderFiscalEstornoBadge(documents, operationDrafts),
    ...resolveOrderFiscalDevolucaoBadge(documents, operationDrafts),
    ...(hasConfirmedEstornoHml && !hasReplacementHml ? { readyToReissueHml: true } : {}),
    ...(hasConfirmedEstornoProd && !hasReplacementProd ? { readyToReissueProd: true } : {}),
  };
};


