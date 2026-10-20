import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  FiscalOrderEditReplacementRow,
  OrderFiscalBadgeStatus,
} from './orderFiscalBadgeRules.types';
import {
  FISCAL_REJECTION_STATUSES,
  isAuthorizedFiscalDocument,
  isOutboundFiscalDocument,
  newestFirst,
} from './fiscalDocumentPredicates';

const isAuthorized = isAuthorizedFiscalDocument;
const isOutbound = isOutboundFiscalDocument;

/** Returns the set of outbound document IDs whose estorno has been confirmed (authorized). */
export const getEstornoConfirmedDocumentIds = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[]
): Set<string> => {
  const confirmed = new Set<string>();
  for (const draft of drafts) {
    if (
      draft.operation_kind === 'estorno' &&
      draft.status === 'authorized' &&
      draft.original_document_id
    ) {
      confirmed.add(draft.original_document_id);
    }
  }
  return confirmed;
};

export const resolveOrderFiscalBadgeStatus = (
  documents: readonly FiscalDocumentStatusRow[],
  estornoConfirmedIds?: ReadonlySet<string>
): OrderFiscalBadgeStatus => {
  const outboundDocuments = documents.filter(isOutbound);

  const activeAuthorized = outboundDocuments.filter(
    (document) =>
      isAuthorized(document) &&
      String(document.cancellationEventStatus || '').toLowerCase() !== 'registered'
  );

  if (activeAuthorized.length > 0) {
    if (estornoConfirmedIds && activeAuthorized.every((doc) => doc.id && estornoConfirmedIds.has(doc.id))) {
      return 'reversed';
    }
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

export type DocumentRegularizationState = 'confirmed' | 'failed' | 'uncertain' | 'none';

export interface ClassifiedFiscalDocument {
  document: FiscalDocumentStatusRow;
  state: DocumentRegularizationState;
  /** Como a NF foi regularizada, quando `state === 'confirmed'`. */
  via?: 'estorno' | 'cancel';
}

export interface FiscalSituationContext {
  estornoConfirmedIds: ReadonlySet<string>;
  latestEstornoDraftByDocumentId: ReadonlyMap<string, FiscalOperationDraftStatusRow>;
  replacementsByDocumentId: ReadonlyMap<string, FiscalOrderEditReplacementRow>;
  orderCancelled: boolean;
}

/**
 * Classifica a regularização (cancelamento fiscal ou estorno) de uma NF a partir de registros
 * persistidos. Resultado incerto nunca é tratado como falha nem como sucesso.
 */
export const classifyDocumentRegularization = (
  document: FiscalDocumentStatusRow,
  context: FiscalSituationContext
): ClassifiedFiscalDocument => {
  const id = document.id || '';
  const cancellationEvent = String(document.cancellationEventStatus || '').toLowerCase();
  const formallyCancelled =
    String(document.status || '').toLowerCase() === 'cancelada' || cancellationEvent === 'registered';
  if (formallyCancelled) return { document, state: 'confirmed', via: 'cancel' };
  if (id && context.estornoConfirmedIds.has(id)) {
    return { document, state: 'confirmed', via: 'estorno' };
  }

  const draftStatus = String(context.latestEstornoDraftByDocumentId.get(id)?.status || '').toLowerCase();
  if (cancellationEvent === 'rejected' || draftStatus === 'rejected') {
    return { document, state: 'failed' };
  }
  if (
    cancellationEvent === 'unknown' ||
    cancellationEvent === 'transmitting' ||
    draftStatus === 'unknown' ||
    draftStatus === 'transmitting'
  ) {
    return { document, state: 'uncertain' };
  }
  // Intenção de reversão persistida por edição, mas ainda sem confirmação fiscal.
  if (id && context.replacementsByDocumentId.get(id)?.status === 'awaiting_reversal') {
    return { document, state: 'uncertain' };
  }
  return { document, state: 'none' };
};

export interface EnvironmentBadgeResolution {
  status: OrderFiscalBadgeStatus;
  documentId?: string;
}

const newestCreatedAt = (a: ClassifiedFiscalDocument, b: ClassifiedFiscalDocument) =>
  newestFirst(a.document, b.document);

/**
 * Resolve o rótulo NF/NFH de um ambiente pela ordem de prioridade:
 * 1. regularização anterior com falha/incerta;
 * 2. pedido cancelado com regularização concluída (estorno ou cancelamento fiscal);
 * 3. pedido ativo editado, NF anterior regularizada e nova NF não autorizada;
 * 4. demais estados (autorizada, rejeitada, erro etc.), preservando o comportamento legado.
 * O status comercial sozinho nunca prova regularização: exige estorno autorizado ou evento 110111.
 */
export const resolveEnvironmentBadge = (
  environmentDocuments: readonly FiscalDocumentStatusRow[],
  legacyStatus: OrderFiscalBadgeStatus,
  context: FiscalSituationContext
): EnvironmentBadgeResolution => {
  const classified = environmentDocuments
    .filter((document) => isAuthorized(document) || String(document.status || '').toLowerCase() === 'cancelada')
    .map((document) => classifyDocumentRegularization(document, context));

  const failed = classified.filter((item) => item.state === 'failed').sort(newestCreatedAt)[0];
  if (failed) return { status: 'regularization_failed', documentId: failed.document.id };

  const uncertain = classified.filter((item) => item.state === 'uncertain').sort(newestCreatedAt)[0];
  if (uncertain) return { status: 'regularization_uncertain', documentId: uncertain.document.id };

  if (!classified.length || classified.some((item) => item.state === 'none')) {
    return { status: legacyStatus };
  }

  // Todas as notas válidas do ambiente foram regularizadas.
  const latestClosure = [...classified].sort(newestCreatedAt)[0];
  const closureStatus: OrderFiscalBadgeStatus =
    latestClosure.via === 'estorno' ? 'reversed' : 'cancelled';
  if (context.orderCancelled) return { status: closureStatus };

  const awaitingNewEmission = classified.some((item) => {
    const replacement = item.document.id
      ? context.replacementsByDocumentId.get(item.document.id)
      : undefined;
    return Boolean(replacement) && replacement?.status !== 'completed';
  });
  if (!awaitingNewEmission) return { status: closureStatus };

  const latestOutbound = environmentDocuments
    .filter((document) => document.id)
    .sort(newestFirst)[0];
  return { status: 'reissue_required', documentId: latestOutbound?.id };
};

export const buildFiscalSituationContext = (
  documents: readonly FiscalDocumentStatusRow[],
  drafts: readonly FiscalOperationDraftStatusRow[],
  orderCancelled: boolean,
  replacements: readonly FiscalOrderEditReplacementRow[]
): FiscalSituationContext => {
  const latestEstornoDraftByDocumentId = new Map<string, FiscalOperationDraftStatusRow>();
  for (const draft of [...drafts].sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  )) {
    if (draft.operation_kind !== 'estorno' || !draft.original_document_id) continue;
    if (!latestEstornoDraftByDocumentId.has(draft.original_document_id)) {
      latestEstornoDraftByDocumentId.set(draft.original_document_id, draft);
    }
  }
  return {
    estornoConfirmedIds: getEstornoConfirmedDocumentIds(documents, drafts),
    latestEstornoDraftByDocumentId,
    replacementsByDocumentId: new Map(
      replacements.map((replacement) => [replacement.original_document_id, replacement])
    ),
    orderCancelled,
  };
};
