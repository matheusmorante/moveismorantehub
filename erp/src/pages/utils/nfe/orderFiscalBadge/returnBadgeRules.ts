import type {
  ReturnFiscalBadgeStatus,
  ReturnFiscalDocumentSummary,
} from './orderFiscalBadgeRules.types';

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
