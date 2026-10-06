import {
  getFiscalIssuePresentation,
  getFiscalIssueTechnicalDetails,
  type FiscalIssueResult,
} from '@/pages/utils/nfe/fiscalIssuePresentation';
import { formatCancellationTimeRemaining } from '@/pages/utils/nfe/nfeEventRules';
import type {
  CancellationEligibility,
  FiscalIssueFeedback,
  NfeDocumentRecord,
} from '../types/fiscalDocuments.types';

export function makeFiscalIssueFeedback(
  result: FiscalIssueResult,
  document: NfeDocumentRecord
): FiscalIssueFeedback {
  const context: FiscalIssueResult = {
    ...result,
    documentId: result.documentId || document.id,
    nfeNumber: result.nfeNumber || document.numero_nfe,
    model: result.model || document.modelo,
    environment: result.environment || document.ambiente,
  };
  return {
    presentation: getFiscalIssuePresentation(context),
    technicalDetails: getFiscalIssueTechnicalDetails(context),
    document,
  };
}

export function getCancellationDeadlineLabel(
  doc: NfeDocumentRecord,
  eligibility?: CancellationEligibility
): string | null {
  if (!['autorizada', 'homologada'].includes(doc.status)) return null;
  const deadlineValue = eligibility?.deadline;
  const deadline = deadlineValue ? new Date(deadlineValue) : null;
  if (!deadline || !Number.isFinite(deadline.getTime())) {
    return 'Prazo de cancelamento indisponível';
  }
  const remainingMs = deadline.getTime() - Date.now();
  if (remainingMs < 0) {
    return `Prazo normal expirado • limite ${deadline.toLocaleString('pt-BR')}`;
  }
  return `Cancelamento até ${deadline.toLocaleString('pt-BR')} • restam ${formatCancellationTimeRemaining(remainingMs)}`;
}
