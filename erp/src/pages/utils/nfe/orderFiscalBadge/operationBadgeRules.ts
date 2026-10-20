import type {
  FiscalDocumentStatusRow,
  FiscalOperationDraftStatusRow,
  OrderFiscalBadgeStatuses,
  OrderFiscalOperationBadgeStatus,
} from './orderFiscalBadgeRules.types';
import {
  FISCAL_REJECTION_STATUSES,
  isAuthorizedFiscalDocument,
  productionFirst,
} from './fiscalDocumentPredicates';

export const resolveFiscalOperationBadge = (
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
